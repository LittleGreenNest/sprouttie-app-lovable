#!/usr/bin/env python3
"""
Pushes sprouttie_testing_guide.csv into the Sprouttie tracking sheet as its own tab.

Auth follows the same pattern as sprouttie_sheet_sync.py: a Google service
account JSON, located via GOOGLE_CREDS_PATH. The service account must have edit
access on the sheet (share the sheet with its client_email, same as before).

    python3 add_testing_guide_tab.py
"""
import csv
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env.sheets")

import gspread
from google.oauth2.service_account import Credentials

SHEET_ID = "1A2RI2B3KbElXuNEaEnGJp9TVofbJXadVUdtdNxcoZ_M"
CREDS_FILE = os.getenv(
    "GOOGLE_CREDS_PATH",
    "/Users/cyrenachio/Downloads/opensofthr-website-revamp-adcbbda13610.json",
)
CSV_PATH = Path(__file__).parent / "sprouttie_testing_guide.csv"
# Stable title on purpose: a dated title spawned a new tab on every run and
# left competing copies of the guide in the sheet.
TAB_TITLE = "🧪 Testing Guide"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

_HEADER_BG = {"red": 0.204, "green": 0.267, "blue": 0.392}
_HEADER_FG = {"red": 1.0, "green": 1.0, "blue": 1.0}
_SECTION_BG = {"red": 0.988, "green": 0.910, "blue": 0.698}
_DECISION_BG = {"red": 0.988, "green": 0.733, "blue": 0.733}


def main():
    if not Path(CREDS_FILE).exists():
        sys.exit(
            f"Service account JSON not found at:\n  {CREDS_FILE}\n\n"
            "Re-download it from Google Cloud Console, or point GOOGLE_CREDS_PATH\n"
            "at wherever you saved it, then run this again."
        )

    rows = list(csv.reader(CSV_PATH.open(encoding="utf-8")))

    creds = Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
    sh = gspread.authorize(creds).open_by_key(SHEET_ID)

    # Put the guide first so it is the tab you land on.
    try:
        ws = sh.worksheet(TAB_TITLE)
        ws.clear()
    except gspread.exceptions.WorksheetNotFound:
        ws = sh.add_worksheet(title=TAB_TITLE, rows=len(rows) + 20, cols=8, index=0)

    ws.update(values=rows, range_name="A1")
    ws.update(values=[[f"Regenerated {datetime.now().strftime('%Y-%m-%d %H:%M')}"]],
              range_name=f"A{len(rows) + 2}")

    section_rows = [i for i, r in enumerate(rows) if r[1].startswith("—")]
    decision_rows = [i for i, r in enumerate(rows) if "DECISION NEEDED" in r[1]]

    reqs = [
        # header
        {"repeatCell": {
            "range": {"sheetId": ws.id, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {
                "backgroundColor": _HEADER_BG,
                "textFormat": {"bold": True, "foregroundColor": _HEADER_FG},
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)",
        }},
        {"updateSheetProperties": {
            "properties": {"sheetId": ws.id, "gridProperties": {"frozenRowCount": 1}},
            "fields": "gridProperties.frozenRowCount",
        }},
        # readable widths + wrapping
        {"updateDimensionProperties": {
            "range": {"sheetId": ws.id, "dimension": "COLUMNS", "startIndex": 3, "endIndex": 5},
            "properties": {"pixelSize": 340},
            "fields": "pixelSize",
        }},
        {"updateDimensionProperties": {
            "range": {"sheetId": ws.id, "dimension": "COLUMNS", "startIndex": 6, "endIndex": 7},
            "properties": {"pixelSize": 300},
            "fields": "pixelSize",
        }},
        {"repeatCell": {
            "range": {"sheetId": ws.id, "startRowIndex": 1},
            "cell": {"userEnteredFormat": {"wrapStrategy": "WRAP",
                                           "verticalAlignment": "TOP"}},
            "fields": "userEnteredFormat(wrapStrategy,verticalAlignment)",
        }},
    ]

    for i in section_rows:
        bg = _DECISION_BG if i in decision_rows else _SECTION_BG
        reqs.append({"repeatCell": {
            "range": {"sheetId": ws.id, "startRowIndex": i, "endRowIndex": i + 1},
            "cell": {"userEnteredFormat": {"backgroundColor": bg,
                                           "textFormat": {"bold": True}}},
            "fields": "userEnteredFormat(backgroundColor,textFormat)",
        }})

    # Status dropdown
    reqs.append({"setDataValidation": {
        "range": {"sheetId": ws.id, "startRowIndex": 1, "startColumnIndex": 5, "endColumnIndex": 6},
        "rule": {
            "condition": {"type": "ONE_OF_LIST", "values": [
                {"userEnteredValue": v} for v in ("Pass", "Fail", "Skipped")
            ]},
            "showCustomUi": True,
        },
    }})

    sh.batch_update({"requests": reqs})
    print(f"Added tab '{TAB_TITLE}' ({len(rows)} rows)")
    print(f"  https://docs.google.com/spreadsheets/d/{SHEET_ID}")


if __name__ == "__main__":
    main()
