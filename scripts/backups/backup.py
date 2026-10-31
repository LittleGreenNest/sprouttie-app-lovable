#!/usr/bin/env python3
"""Encrypted off-site backup. No production restore or unencrypted uploads."""
import configparser
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile
from datetime import datetime, timezone, timedelta
from urllib.parse import parse_qs, quote, urlsplit
from urllib.request import Request, urlopen

PROJECT = 'xqwrfbyqhuxveoqksuqz'
ORIGIN = f'https://{PROJECT}.supabase.co'
REMOTE = f'gdrive:Sprouttie Backups/{PROJECT}'
SNAPSHOT = re.compile(r'^sprouttie-(\d{8}T\d{6}Z)-[a-f0-9]{8}\.tar\.gz\.age$')


class BackupError(Exception):
    pass


def command(args, *, capture=False):
    # Never echo subprocess output: database URLs, file names and records are private.
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            timeout=1800, check=False)
    if result.returncode:
        raise BackupError(f'{Path(args[0]).name} failed; private diagnostic output withheld')
    return result.stdout if capture else None


def digest(path):
    with open(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


class Storage:
    def __init__(self, key):
        self.key = key

    def request(self, path, payload=None):
        body = None if payload is None else json.dumps(payload).encode()
        req = Request(ORIGIN + '/storage/v1/' + path, data=body, headers={
            'apikey': self.key, 'Authorization': 'Bearer ' + self.key,
            'Content-Type': 'application/json',
        })
        return urlopen(req, timeout=120)

    def json(self, path, payload=None):
        with self.request(path, payload) as response:
            return json.load(response)

    def objects(self, bucket, prefix=''):
        offset = 0
        while True:
            page = self.json('object/list/' + quote(bucket, safe=''), {
                'prefix': prefix, 'limit': 100, 'offset': offset,
                'sortBy': {'column': 'name', 'order': 'asc'},
            })
            if not isinstance(page, list):
                raise BackupError('Invalid Storage listing')
            for item in page:
                name = item['name']
                if name in ('.', '..') or '/' in name or '\\' in name:
                    raise BackupError('Unsafe Storage path')
                path = prefix + name
                if item.get('id') is None:
                    yield from self.objects(bucket, path + '/')
                else:
                    yield path, item.get('metadata') or {}
            if len(page) < 100:
                return
            offset += len(page)

    def export(self, destination):
        buckets = self.json('bucket')
        if not isinstance(buckets, list):
            raise BackupError('Invalid bucket listing')
        inventory = {'buckets': buckets, 'objects': []}
        for bucket in buckets:
            for name, metadata in self.objects(bucket['id']):
                # Numbered files avoid using any user-controlled path on disk.
                relative = f'media/{len(inventory["objects"]):08d}.bin'
                target = destination / relative
                target.parent.mkdir(exist_ok=True)
                route = 'object/authenticated/' + quote(bucket['id'], safe='') + '/' + quote(name, safe='/')
                with self.request(route) as response, target.open('wb') as output:
                    while chunk := response.read(1024 * 1024):
                        output.write(chunk)
                expected = metadata.get('size')
                if expected is not None and target.stat().st_size != int(expected):
                    raise BackupError('Incomplete Storage download')
                inventory['objects'].append({
                    'bucket': bucket['id'], 'name': name, 'file': relative,
                    'metadata': metadata, 'sha256': digest(target),
                })
        (destination / 'storage.json').write_text(json.dumps(inventory))
        return len(inventory['objects'])


def verify_upload(source, directory):
    remote = REMOTE + '/' + source.name
    command(['rclone', 'copyto', str(source), remote, '--immutable', '--retries', '3'])
    downloaded = directory / 'verification.age'
    command(['rclone', 'copyto', remote, str(downloaded), '--retries', '3'])
    if digest(source) != digest(downloaded):
        raise BackupError('Uploaded backup failed round-trip verification')


def expire_old(now):
    # Only our exact generated names in this project's dedicated folder qualify.
    entries = json.loads(command(['rclone', 'lsjson', REMOTE, '--files-only'], capture=True))
    for entry in entries:
        name = entry.get('Name', '')
        match = SNAPSHOT.fullmatch(name)
        if match and '/' not in entry.get('Path', ''):
            created = datetime.strptime(match[1], '%Y%m%dT%H%M%SZ').replace(tzinfo=timezone.utc)
            if created < now - timedelta(days=7):
                command(['rclone', 'deletefile', REMOTE + '/' + name, '--drive-use-trash=false'])


def validate_settings():
    required = ('BACKUP_DATABASE_URL', 'BACKUP_STORAGE_KEY', 'BACKUP_AGE_RECIPIENT', 'BACKUP_RCLONE_CONFIG')
    if any(not os.environ.get(name) for name in required):
        raise BackupError('Backup credentials or encryption recipient not configured')
    url = urlsplit(os.environ['BACKUP_DATABASE_URL'])
    if url.scheme not in ('postgres', 'postgresql') or url.port != 5432:
        raise BackupError('Use the Supabase direct or session-pooler database connection on port 5432')
    if PROJECT not in (url.hostname or '') + (url.username or ''):
        raise BackupError('Database connection does not identify the Sprouttie project')
    if parse_qs(url.query).get('sslmode') not in (['require'], ['verify-full']):
        raise BackupError('Database connection must require TLS')
    if not os.environ['BACKUP_AGE_RECIPIENT'].startswith('age1'):
        raise BackupError('Use an age public encryption recipient, never a private key')
    config = configparser.ConfigParser(interpolation=None)
    config.read_string(os.environ['BACKUP_RCLONE_CONFIG'])
    if (not config.has_section('gdrive') or config['gdrive'].get('type') != 'drive'
            or config['gdrive'].get('scope') != 'drive.file'):
        raise BackupError('Google Drive must use a dedicated gdrive remote with drive.file scope')


def main():
    os.umask(0o077)
    validate_settings()
    now = datetime.now(timezone.utc)
    with tempfile.TemporaryDirectory(prefix='sprouttie-backup-') as scratch:
        root = Path(scratch)
        config = root / 'rclone.conf'
        config.write_text(os.environ['BACKUP_RCLONE_CONFIG'])
        os.environ['RCLONE_CONFIG'] = str(config)
        payload = root / 'payload'
        payload.mkdir()
        # Official CLI filters managed schemas and reserved roles for Supabase restore.
        base = ['supabase', 'db', 'dump', '--db-url', os.environ['BACKUP_DATABASE_URL']]
        for filename, options in (
            ('roles.sql', ['--role-only']),
            ('schema.sql', []),
            ('data.sql', ['--data-only', '--use-copy', '-x', 'storage.buckets_vectors', '-x', 'storage.vector_indexes']),
        ):
            command(base + options + ['--file', str(payload / filename)])
            if not (payload / filename).is_file() or (payload / filename).stat().st_size < 10:
                raise BackupError('Missing or empty database export')
        # Include applied migration history separately; CLI excludes it by default.
        command(base + ['--schema', 'supabase_migrations', '--file', str(payload / 'migrations-schema.sql')])
        command(base + ['--schema', 'supabase_migrations', '--data-only', '--use-copy', '--file', str(payload / 'migrations-data.sql')])
        objects = Storage(os.environ['BACKUP_STORAGE_KEY']).export(payload)
        files = {str(p.relative_to(payload)): digest(p) for p in payload.rglob('*') if p.is_file()}
        (payload / 'manifest.json').write_text(json.dumps({
            'format': 1, 'project': PROJECT, 'started_at': now.isoformat(), 'sha256': files,
            'media_objects': objects,
            'consistency': 'Sequential database exports and media downloads; not an atomic project snapshot.',
            'not_included': ['Stripe records', 'provider settings', 'secrets', 'edge function source (kept in Git)'],
        }))
        archive = root / 'snapshot.tar.gz'
        with tarfile.open(archive, 'w:gz') as tar:
            tar.add(payload, arcname='snapshot')
        name = 'sprouttie-' + now.strftime('%Y%m%dT%H%M%SZ') + '-' + os.urandom(4).hex() + '.tar.gz.age'
        encrypted = root / name
        command(['age', '--recipient', os.environ['BACKUP_AGE_RECIPIENT'], '--output', str(encrypted), str(archive)])
        verify_upload(encrypted, root)
        expire_old(now)
        print('Encrypted backup uploaded and round-trip verified. Recovery drill remains a separate check.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # No traceback, filenames, HTTP bodies or raw subprocess errors in public CI logs.
        print('Backup FAILED: ' + (str(error) if isinstance(error, BackupError) else type(error).__name__))
        raise SystemExit(1)
