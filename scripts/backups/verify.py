#!/usr/bin/env python3
"""Check decrypted archive contents without restoring or displaying user records."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys
import tarfile


def verify(archive):
    with tarfile.open(archive, 'r:gz') as tar:
        members = tar.getmembers()
        names = [m.name for m in members]
        if len(set(names)) != len(names):
            raise ValueError('Duplicate archive entries')
        for member in members:
            path = PurePosixPath(member.name)
            if (path.is_absolute() or '..' in path.parts or path.parts[0] != 'snapshot'
                    or not (member.isfile() or member.isdir())):
                raise ValueError('Unsafe archive entry')
        manifest = json.load(tar.extractfile('snapshot/manifest.json'))
        if manifest['format'] != 1 or manifest['project'] != 'xqwrfbyqhuxveoqksuqz':
            raise ValueError('Unexpected backup format or project')
        files = {m.name.removeprefix('snapshot/') for m in members if m.isfile()}
        if files != set(manifest['sha256']) | {'manifest.json'}:
            raise ValueError('Backup inventory mismatch')
        for name, expected in manifest['sha256'].items():
            with tar.extractfile('snapshot/' + name) as stream:
                if hashlib.file_digest(stream, 'sha256').hexdigest() != expected:
                    raise ValueError('Backup content checksum mismatch')
        storage = json.load(tar.extractfile('snapshot/storage.json'))
        if len(storage['objects']) != manifest['media_objects']:
            raise ValueError('Media inventory mismatch')
        for item in storage['objects']:
            if manifest['sha256'].get(item['file']) != item['sha256']:
                raise ValueError('Media checksum mismatch')
    return True


if __name__ == '__main__':
    try:
        verify(Path(sys.argv[1]))
        print('Archive checksums and media inventory verified. Database restore is still a separate test.')
    except Exception:
        print('Archive verification FAILED. No data restored.')
        raise SystemExit(1)
