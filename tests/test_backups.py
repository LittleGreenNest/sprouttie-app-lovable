import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from datetime import datetime, timezone
import tarfile
import os


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).parents[1] / 'scripts/backups' / (name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


backup = module('backup')
verify = module('verify')


class BackupTests(unittest.TestCase):
    def test_missing_credentials_fail_before_any_export(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(backup, 'command') as command:
            with self.assertRaises(backup.BackupError):
                backup.main()
            command.assert_not_called()

    def test_reject_full_drive_scope_and_plaintext_database_connection(self):
        settings = {
            'BACKUP_DATABASE_URL': f'postgresql://postgres.{backup.PROJECT}:fake@aws-0-test.pooler.supabase.com:5432/postgres?sslmode=require',
            'BACKUP_STORAGE_KEY': 'fake', 'BACKUP_AGE_RECIPIENT': 'age1fake',
            'BACKUP_RCLONE_CONFIG': '[gdrive]\ntype = drive\nscope = drive\n',
        }
        with patch.dict(os.environ, settings, clear=True):
            with self.assertRaisesRegex(backup.BackupError, 'drive.file'):
                backup.validate_settings()
            os.environ['BACKUP_RCLONE_CONFIG'] = '[gdrive]\ntype = drive\nscope = drive.file\n'
            backup.validate_settings()
            os.environ['BACKUP_DATABASE_URL'] = settings['BACKUP_DATABASE_URL'].replace('?sslmode=require', '')
            with self.assertRaisesRegex(backup.BackupError, 'TLS'):
                backup.validate_settings()

    def test_storage_pagination_and_nested_folders(self):
        storage = backup.Storage('not-a-real-key')
        calls = []

        def page(route, payload):
            calls.append(payload.copy())
            if payload['prefix']:
                return [{'name': 'child.jpg', 'id': 'file', 'metadata': {'size': 3}}]
            if payload['offset'] == 0:
                return [{'name': str(i), 'id': str(i)} for i in range(99)] + [{'name': 'folder', 'id': None}]
            return [{'name': 'last.jpg', 'id': 'last'}]

        with patch.object(storage, 'json', side_effect=page):
            objects = list(storage.objects('photos'))
        self.assertEqual(len(objects), 101)
        self.assertIn(('folder/child.jpg', {'size': 3}), objects)
        self.assertEqual(calls[-1]['offset'], 100)

    def test_storage_traversal_is_rejected(self):
        storage = backup.Storage('not-a-real-key')
        with patch.object(storage, 'json', return_value=[{'name': '..', 'id': None}]):
            with self.assertRaises(backup.BackupError):
                list(storage.objects('photos'))

    def test_partial_media_download_is_not_success(self):
        storage = backup.Storage('not-a-real-key')
        with tempfile.TemporaryDirectory() as scratch:
            with patch.object(storage, 'json', return_value=[{'id': 'photos'}]), \
                    patch.object(storage, 'objects', return_value=iter([('x.jpg', {'size': 10})])), \
                    patch.object(storage, 'request', return_value=io.BytesIO(b'short')):
                with self.assertRaises(backup.BackupError):
                    storage.export(Path(scratch))

    def test_remote_corruption_is_rejected(self):
        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            source = root / 'snapshot.age'
            source.write_bytes(b'valid ciphertext')

            def fake_command(args, **kwargs):
                if args[2].startswith('gdrive:'):
                    Path(args[3]).write_bytes(b'corrupted ciphertext')

            with patch.object(backup, 'command', side_effect=fake_command):
                with self.assertRaises(backup.BackupError):
                    backup.verify_upload(source, root)

    def test_retention_cannot_delete_other_drive_files(self):
        old = 'sprouttie-20261001T000000Z-aabbccdd.tar.gz.age'
        recent = 'sprouttie-20261031T000000Z-aabbccdd.tar.gz.age'
        rows = [{'Name': n, 'Path': n} for n in [old, recent, 'family-photos.zip', 'sprouttie-20260101-secret.txt']]
        with patch.object(backup, 'command', return_value=json.dumps(rows).encode()) as command:
            backup.expire_old(datetime(2026, 10, 31, tzinfo=timezone.utc))
        deletions = [c.args[0] for c in command.call_args_list if c.args[0][1] == 'deletefile']
        self.assertEqual(deletions, [['rclone', 'deletefile', backup.REMOTE + '/' + old, '--drive-use-trash=false']])

    def test_archive_integrity_and_tamper_detection(self):
        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            payload = root / 'snapshot'
            payload.mkdir()
            (payload / 'storage.json').write_text('{"objects": []}')
            (payload / 'data.sql').write_text('sample fixture, no personal data')
            manifest = {'format': 1, 'project': backup.PROJECT, 'media_objects': 0,
                        'sha256': {p.name: backup.digest(p) for p in payload.iterdir()}}
            (payload / 'manifest.json').write_text(json.dumps(manifest))
            archive = root / 'test.tar.gz'
            with tarfile.open(archive, 'w:gz') as tar:
                tar.add(payload, arcname='snapshot')
            self.assertTrue(verify.verify(archive))
            (payload / 'data.sql').write_text('tampered')
            with tarfile.open(archive, 'w:gz') as tar:
                tar.add(payload, arcname='snapshot')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                verify.verify(archive)


if __name__ == '__main__':
    unittest.main()
