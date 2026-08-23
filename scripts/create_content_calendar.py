#!/usr/bin/env python3
"""
Creates (or refreshes) the 📅 Content Calendar tab in the Sprouttie Google Sheet.
Run once to set up; re-run anytime to reset the structure without touching other tabs.

Usage:  python3 scripts/create_content_calendar.py
Config: scripts/.env.sheets
"""

from pathlib import Path
from dotenv import load_dotenv
import gspread
from google.oauth2.service_account import Credentials
import os

load_dotenv(Path(__file__).parent / ".env.sheets")

SHEET_ID  = "1A2RI2B3KbElXuNEaEnGJp9TVofbJXadVUdtdNxcoZ_M"
CREDS_FILE = os.getenv("GOOGLE_CREDS_PATH",
                       "/Users/cyrenachio/Downloads/opensofthr-website-revamp-adcbbda13610.json")

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

_HEADER_BG = {"red": 0.204, "green": 0.267, "blue": 0.392}
_HEADER_FG = {"red": 1.0,   "green": 1.0,   "blue": 1.0}
_GREEN     = {"red": 0.718, "green": 0.882, "blue": 0.804}
_AMBER     = {"red": 0.988, "green": 0.910, "blue": 0.698}
_GREY      = {"red": 0.953, "green": 0.953, "blue": 0.953}
_WHITE     = {"red": 1.0,   "green": 1.0,   "blue": 1.0}
_BLUE_LIGHT = {"red": 0.816, "green": 0.878, "blue": 0.976}

HEADERS = [
    "Week", "Publish Date", "Platform", "Type", "Title / Hook",
    "Sprouttie CTA?", "Status", "Notes"
]

ROWS = [
    # Week 1
    ["Week 1", "2026-05-31", "Substack", "Article",
     "The Day I Stopped Looking for Someone Who Understood",
     "🟡 Light", "Draft", "Expand the spiral paragraph from founding article"],
    ["Week 1", "2026-06-02", "TikTok", "Video",
     "I spent years looking for people who understood my family situation. It wasn't helping.",
     "❌ No", "Not started", ""],
    ["Week 1", "2026-06-04", "TikTok", "Video",
     "The most unexpected thing about becoming a mum wasn't the baby.",
     "🟡 Light", "Not started", "Soft Sprouttie mention at end"],

    # Week 2
    ["Week 2", "2026-06-07", "Substack", "Article",
     "Language Guilt Isn't About Language",
     "❌ No", "Not started", "Pillar piece — identity/belonging/culture"],
    ["Week 2", "2026-06-09", "TikTok", "Video",
     "I don't actually feel guilty that my Mandarin isn't perfect.",
     "❌ No", "Not started", ""],
    ["Week 2", "2026-06-11", "TikTok", "Video",
     "My son is learning Mandarin before I am.",
     "✅ Natural", "Not started", "Strongest Sprouttie video in Week 2"],

    # Week 3
    ["Week 3", "2026-06-14", "Substack", "Article",
     "The Quiet Advantage of a Three-Generation Home",
     "❌ No", "Not started", "Acknowledge trade-offs before naming advantages"],
    ["Week 3", "2026-06-16", "TikTok", "Video",
     "Everyone talks about the drama of living with your in-laws. Here's the part nobody talks about.",
     "❌ No", "Not started", ""],
    ["Week 3", "2026-06-18", "TikTok", "Video",
     "Two things can be true at the same time.",
     "❌ No", "Not started", "Very aligned with your voice"],

    # Week 4
    ["Week 4", "2026-06-21", "Substack", "Article",
     "I Didn't Build an App. I Built a Language Habit.",
     "✅ Direct", "Not started", "First Sprouttie-centred essay"],
    ["Week 4", "2026-06-23", "TikTok", "Video",
     "Nobody needs another flashcard app.",
     "✅ Yes", "Not started", "Strong founder content"],
    ["Week 4", "2026-06-25", "TikTok", "Video",
     "This is the exact Mandarin routine I use with my toddler.",
     "✅ Natural", "Not started", "Show workflow, not product"],
]

STATUS_COLORS = {
    "Published":   _GREEN,
    "Draft":       _AMBER,
    "In Progress": _AMBER,
    "Not started": _GREY,
}


def main():
    creds = Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)

    # Get or create tab
    tab_title = "📅 Content Calendar"
    try:
        ws = sh.worksheet(tab_title)
        ws.clear()
        print(f"Cleared existing tab: {tab_title}")
    except gspread.exceptions.WorksheetNotFound:
        ws = sh.add_worksheet(title=tab_title, rows=100, cols=len(HEADERS))
        print(f"Created new tab: {tab_title}")

    # Write headers + data
    all_rows = [HEADERS] + ROWS
    ws.update(all_rows, "A1")

    # Build formatting requests
    requests = []

    # Header row formatting
    requests.append({"repeatCell": {
        "range": {
            "sheetId": ws.id, "startRowIndex": 0, "endRowIndex": 1,
            "startColumnIndex": 0, "endColumnIndex": len(HEADERS)
        },
        "cell": {"userEnteredFormat": {
            "backgroundColor": _HEADER_BG,
            "textFormat": {"foregroundColor": _HEADER_FG, "bold": True, "fontSize": 10},
            "horizontalAlignment": "CENTER",
            "verticalAlignment": "MIDDLE",
        }},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
    }})

    # Freeze header row
    requests.append({"updateSheetProperties": {
        "properties": {"sheetId": ws.id, "gridProperties": {"frozenRowCount": 1}},
        "fields": "gridProperties.frozenRowCount",
    }})

    # Week band colours (alternating light blue / white)
    week_colors = [_BLUE_LIGHT, _WHITE, _BLUE_LIGHT, _WHITE]
    week_map = {"Week 1": 0, "Week 2": 1, "Week 3": 2, "Week 4": 3}
    for i, row in enumerate(ROWS):
        row_idx = i + 1
        week_color = week_colors[week_map.get(row[0], 0)]
        requests.append({"repeatCell": {
            "range": {
                "sheetId": ws.id,
                "startRowIndex": row_idx, "endRowIndex": row_idx + 1,
                "startColumnIndex": 0, "endColumnIndex": len(HEADERS)
            },
            "cell": {"userEnteredFormat": {"backgroundColor": week_color}},
            "fields": "userEnteredFormat.backgroundColor",
        }})

    # Status column (col 6, index 6) colour by value
    for i, row in enumerate(ROWS):
        status = row[6]
        color = STATUS_COLORS.get(status, _WHITE)
        requests.append({"repeatCell": {
            "range": {
                "sheetId": ws.id,
                "startRowIndex": i + 1, "endRowIndex": i + 2,
                "startColumnIndex": 6, "endColumnIndex": 7
            },
            "cell": {"userEnteredFormat": {"backgroundColor": color}},
            "fields": "userEnteredFormat.backgroundColor",
        }})

    # Column widths
    col_widths = [70, 110, 90, 80, 420, 120, 110, 220]
    for col_idx, width in enumerate(col_widths):
        requests.append({"updateDimensionProperties": {
            "range": {
                "sheetId": ws.id, "dimension": "COLUMNS",
                "startIndex": col_idx, "endIndex": col_idx + 1
            },
            "properties": {"pixelSize": width},
            "fields": "pixelSize",
        }})

    sh.batch_update({"requests": requests})
    print("✅ Content Calendar tab created successfully.")
    print(f"   Sheet: https://docs.google.com/spreadsheets/d/{SHEET_ID}")


if __name__ == "__main__":
    main()
