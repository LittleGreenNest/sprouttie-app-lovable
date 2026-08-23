#!/usr/bin/env python3
"""
Sprouttie Sheet Sync
Writes project status to Google Sheets across 4 tabs:
  🚀 Launch Checklist | 💳 Stripe Health | 👥 User Stats | ✅ Onboarding QA

Usage:  python3 scripts/sprouttie_sheet_sync.py
Config: scripts/.env.sheets  (copy from .env.sheets.template)
"""

import os
import re
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env.sheets")

import gspread
from google.oauth2.service_account import Credentials
import stripe
import requests

# ── Config ───────────────────────────────────────────────────────────────────
SHEET_ID          = "1A2RI2B3KbElXuNEaEnGJp9TVofbJXadVUdtdNxcoZ_M"
CREDS_FILE        = os.getenv("GOOGLE_CREDS_PATH",
                              "/Users/cyrenachio/Downloads/opensofthr-website-revamp-adcbbda13610.json")
SUPABASE_URL      = "https://xqwrfbyqhuxveoqksuqz.supabase.co"
SUPABASE_KEY      = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
STRIPE_KEY        = os.getenv("STRIPE_SECRET_KEY", "")
TODAY             = datetime.now().strftime("%Y-%m-%d %H:%M")
PROJECT_ROOT      = Path(__file__).parent.parent

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# ── Colour palette ────────────────────────────────────────────────────────────
_GREEN     = {"red": 0.718, "green": 0.882, "blue": 0.804}
_AMBER     = {"red": 0.988, "green": 0.910, "blue": 0.698}
_RED       = {"red": 0.988, "green": 0.733, "blue": 0.733}
_GREY      = {"red": 0.953, "green": 0.953, "blue": 0.953}
_WHITE     = {"red": 1.0,   "green": 1.0,   "blue": 1.0}
_HEADER_BG = {"red": 0.204, "green": 0.267, "blue": 0.392}
_HEADER_FG = {"red": 1.0,   "green": 1.0,   "blue": 1.0}


# ── Sheet helpers ─────────────────────────────────────────────────────────────
def connect_sheet():
    creds = Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
    gc = gspread.authorize(creds)
    return gc.open_by_key(SHEET_ID)


def get_or_create_tab(sh, title, index=None):
    try:
        ws = sh.worksheet(title)
        ws.clear()
        return ws
    except gspread.exceptions.WorksheetNotFound:
        kwargs = {"rows": 200, "cols": 20}
        if index is not None:
            kwargs["index"] = index
        return sh.add_worksheet(title=title, **kwargs)


def fmt_header(ws, col_count):
    return {"repeatCell": {
        "range": {"sheetId": ws.id, "startRowIndex": 0, "endRowIndex": 1,
                  "startColumnIndex": 0, "endColumnIndex": col_count},
        "cell": {"userEnteredFormat": {
            "backgroundColor": _HEADER_BG,
            "textFormat": {"foregroundColor": _HEADER_FG, "bold": True, "fontSize": 10},
            "horizontalAlignment": "CENTER",
            "verticalAlignment": "MIDDLE",
        }},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
    }}


def fmt_freeze(ws):
    return {"updateSheetProperties": {
        "properties": {"sheetId": ws.id, "gridProperties": {"frozenRowCount": 1}},
        "fields": "gridProperties.frozenRowCount",
    }}


def fmt_row_color(ws, row_idx, color, col_count):
    return {"repeatCell": {
        "range": {"sheetId": ws.id, "startRowIndex": row_idx, "endRowIndex": row_idx + 1,
                  "startColumnIndex": 0, "endColumnIndex": col_count},
        "cell": {"userEnteredFormat": {"backgroundColor": color}},
        "fields": "userEnteredFormat.backgroundColor",
    }}


def fmt_col_widths(ws, widths):
    return [{"updateDimensionProperties": {
        "range": {"sheetId": ws.id, "dimension": "COLUMNS", "startIndex": i, "endIndex": i + 1},
        "properties": {"pixelSize": w},
        "fields": "pixelSize",
    }} for i, w in enumerate(widths)]


def fmt_wrap_top(ws, start_row, end_row, col_count):
    return {"repeatCell": {
        "range": {"sheetId": ws.id, "startRowIndex": start_row, "endRowIndex": end_row,
                  "startColumnIndex": 0, "endColumnIndex": col_count},
        "cell": {"userEnteredFormat": {
            "wrapStrategy": "WRAP",
            "verticalAlignment": "TOP",
        }},
        "fields": "userEnteredFormat(wrapStrategy,verticalAlignment)",
    }}


# ── Tab 1: Launch Checklist ───────────────────────────────────────────────────
def write_launch_checklist(sh):
    ws = get_or_create_tab(sh, "🚀 Launch Checklist", index=0)
    checks = _run_launch_checks()
    headers = ["Check", "Status", "Details", "Last Checked"]
    data = [[c["check"], c["status"], c["details"], TODAY] for c in checks]
    ws.update([headers] + data)

    status_colors = {
        "✅ PASS":   _GREEN,
        "❌ FAIL":   _RED,
        "⚠️ MANUAL": _AMBER,
        "ℹ️ INFO":   _GREY,
    }
    reqs = [fmt_header(ws, 4), fmt_freeze(ws), fmt_wrap_top(ws, 1, len(data) + 1, 4)]
    for i, c in enumerate(checks):
        reqs.append(fmt_row_color(ws, i + 1, status_colors.get(c["status"], _WHITE), 4))
    reqs += fmt_col_widths(ws, [280, 110, 440, 130])
    sh.batch_update({"requests": reqs})
    print(f"  ✓ Launch Checklist — {len(checks)} checks")
    return True


def _run_launch_checks():
    checks = []

    # _redirects
    redir = PROJECT_ROOT / "public" / "_redirects"
    if redir.exists():
        checks.append({"check": "SPA routing (_redirects)", "status": "✅ PASS",
                       "details": f'Content: {redir.read_text().strip()} — commit 4b4a373'})
    else:
        checks.append({"check": "SPA routing (_redirects)", "status": "❌ FAIL",
                       "details": "File missing — Google OAuth mobile redirect will fail"})

    # OG image
    og = PROJECT_ROOT / "public" / "images" / "sprouttie-og.png"
    if og.exists():
        kb = og.stat().st_size // 1024
        checks.append({"check": "OG image (WhatsApp / social preview)", "status": "✅ PASS",
                       "details": f"sprouttie-og.png ({kb} KB, 1200×640px) → https://sprouttie.online/images/sprouttie-og.png"})
    else:
        checks.append({"check": "OG image (WhatsApp / social preview)", "status": "❌ FAIL",
                       "details": "public/images/sprouttie-og.png missing"})

    # Password min length in ResetPassword
    reset = PROJECT_ROOT / "src" / "components" / "auth" / "ResetPassword.jsx"
    if reset.exists():
        src = reset.read_text()
        if "password.length < 8" in src:
            checks.append({"check": "Password min length — ResetPassword", "status": "✅ PASS",
                           "details": "8 chars — matches Signup form. Commit 932772a"})
        else:
            checks.append({"check": "Password min length — ResetPassword", "status": "❌ FAIL",
                           "details": "Not 8 chars — check ResetPassword.jsx"})

    # Stripe price IDs
    plans = PROJECT_ROOT / "src" / "components" / "subscription" / "Plans.jsx"
    if plans.exists():
        src = plans.read_text()
        m = re.search(r"monthly:\s*'(price_[^']+)'", src)
        y = re.search(r"yearly:\s*'(price_[^']+)'", src)
        if m and y:
            checks.append({"check": "Stripe price IDs (Plans.jsx)", "status": "✅ PASS",
                           "details": f"Monthly: {m.group(1)} | Yearly: {y.group(1)}"})
        else:
            checks.append({"check": "Stripe price IDs (Plans.jsx)", "status": "❌ FAIL",
                           "details": "Live price IDs not found in Plans.jsx"})

    # SMTP (confirmed manually, hard-coded)
    checks.append({"check": "SMTP — password reset emails", "status": "✅ PASS",
                   "details": "Brevo relay confirmed working 2026-05-17. Sender: hello@sprouttie.online (778efb001@smtp-brevo.com)"})

    # Stripe API checks
    if STRIPE_KEY:
        stripe.api_key = STRIPE_KEY
        is_live = not STRIPE_KEY.startswith("sk_test_")
        mode = "LIVE" if is_live else "TEST"
        try:
            hooks = stripe.WebhookEndpoint.list(limit=20)
            sp_hooks = [h for h in hooks.data if "xqwrfbyqhuxveoqksuqz" in h.url or "sprouttie" in h.url]
            if sp_hooks:
                h = sp_hooks[0]
                evts = ", ".join(h.enabled_events[:3])
                checks.append({"check": f"Stripe webhook registered ({mode})", "status": "✅ PASS",
                               "details": f"Status: {h.status} | Events: {evts} | URL: {h.url}"})
            else:
                checks.append({"check": f"Stripe webhook registered ({mode})", "status": "❌ FAIL",
                               "details": f"No Sprouttie endpoint found in {mode} mode — create in Stripe Dashboard → Developers → Webhooks"})
        except Exception as e:
            checks.append({"check": "Stripe webhook registered", "status": "⚠️ MANUAL",
                           "details": f"API error: {str(e)[:100]}"})

        checks.append({"check": "Stripe API key mode", "status": "✅ PASS" if is_live else "⚠️ MANUAL",
                       "details": f"Using {mode} key. {'Update STRIPE_SECRET_KEY in scripts/.env.sheets to sk_live_... for real data.' if not is_live else ''}"})
    else:
        checks.append({"check": "Stripe webhook registered", "status": "⚠️ MANUAL",
                       "details": "Add STRIPE_SECRET_KEY to scripts/.env.sheets"})

    # Stripe webhook secret in Supabase
    checks.append({"check": "Stripe webhook secret (Supabase)", "status": "✅ PASS",
                   "details": "STRIPE_WEBHOOK_SECRET updated in Supabase Edge Function secrets 2026-05-23"})

    # Manual items
    checks.append({"check": "Google OAuth redirect URIs", "status": "⚠️ MANUAL",
                   "details": "Supabase → Auth → URL Configuration → Redirect URLs must include: https://sprouttie.online/dashboard"})
    checks.append({"check": "Cloudflare Pages live build", "status": "⚠️ MANUAL",
                   "details": "Verify sprouttie.online serving latest commit (1d7323b)"})
    checks.append({"check": "Pro plan — waitlist only", "status": "ℹ️ INFO",
                   "details": "Pro plan routes to waitlist modal, not Stripe checkout. No action needed until Pro is ready."})

    return checks


# ── Tab 2: Stripe Health ──────────────────────────────────────────────────────
def write_stripe_health(sh):
    ws = get_or_create_tab(sh, "💳 Stripe Health", index=1)

    if not STRIPE_KEY:
        ws.update([["Add STRIPE_SECRET_KEY to scripts/.env.sheets to see Stripe data"]])
        print("  ⚠ Stripe Health — no key configured")
        return False

    stripe.api_key = STRIPE_KEY
    is_live = not STRIPE_KEY.startswith("sk_test_")
    mode = "LIVE" if is_live else "TEST"
    rows = []

    try:
        rows.append(["API Mode", mode, "Use sk_live_... for real data" if not is_live else "Showing live data", TODAY])

        # Subscriptions
        active  = stripe.Subscription.list(status="active",   limit=100)
        trialing= stripe.Subscription.list(status="trialing", limit=100)
        past_due= stripe.Subscription.list(status="past_due", limit=100)
        rows.append(["Active subscriptions",  str(len(active.data)),   "", TODAY])
        rows.append(["Trialing subscriptions",str(len(trialing.data)), "", TODAY])
        rows.append(["Past-due subscriptions",str(len(past_due.data)), "Needs attention if > 0", TODAY])

        # Revenue (30d)
        since = int((datetime.now() - timedelta(days=30)).timestamp())
        charges = stripe.Charge.list(limit=100, created={"gte": since})
        ok_charges = [c for c in charges.data if c.status == "succeeded"]
        fail_charges= [c for c in charges.data if c.status == "failed"]
        revenue = sum(c.amount for c in ok_charges) / 100
        rows.append(["Successful charges (30d)", str(len(ok_charges)),  "", TODAY])
        rows.append(["Revenue (30d, SGD)",        f"${revenue:.2f}",     "", TODAY])
        rows.append(["Failed charges (30d)",       str(len(fail_charges)), "Investigate if > 0", TODAY])

        if ok_charges:
            last = ok_charges[0]
            rows.append(["Last successful payment",
                          f"${last.amount/100:.2f}",
                          datetime.fromtimestamp(last.created).strftime("%Y-%m-%d"),
                          TODAY])
        else:
            rows.append(["Last successful payment", "None in last 30d", "", TODAY])

        # Webhook endpoint
        hooks = stripe.WebhookEndpoint.list(limit=20)
        sp = [h for h in hooks.data if "xqwrfbyqhuxveoqksuqz" in h.url or "sprouttie" in h.url]
        if sp:
            rows.append(["Webhook endpoint", sp[0].status, sp[0].url, TODAY])
        else:
            rows.append(["Webhook endpoint", "NOT REGISTERED",
                         "Add in Stripe Dashboard → Developers → Webhooks", TODAY])

    except Exception as e:
        rows.append(["Error fetching Stripe data", str(e)[:120], "", TODAY])

    headers = ["Metric", "Value", "Notes", "Last Updated"]
    ws.update([headers] + rows)

    attention_rows = {"Past-due subscriptions", "Failed charges (30d)", "Webhook endpoint"}
    reqs = [fmt_header(ws, 4), fmt_freeze(ws)]
    for i, row in enumerate(rows):
        metric, val = row[0], str(row[1])
        if val in ("NOT REGISTERED", "Error") or "Error" in metric:
            color = _RED
        elif metric in attention_rows and val not in ("0", "enabled", ""):
            color = _AMBER
        elif metric in ("Active subscriptions",) and val != "0":
            color = _GREEN
        elif metric == "API Mode" and val == "TEST":
            color = _AMBER
        elif metric == "API Mode" and val == "LIVE":
            color = _GREEN
        else:
            color = _WHITE
        reqs.append(fmt_row_color(ws, i + 1, color, 4))
    reqs += fmt_col_widths(ws, [220, 130, 340, 130])
    sh.batch_update({"requests": reqs})
    print(f"  ✓ Stripe Health — {len(rows)} metrics ({mode} mode)")
    return True


# ── Tab 3: User Stats (Supabase) ──────────────────────────────────────────────
def write_user_stats(sh):
    ws = get_or_create_tab(sh, "👥 User Stats", index=2)

    if not SUPABASE_KEY:
        ws.update([["Add SUPABASE_SERVICE_ROLE_KEY to scripts/.env.sheets to see user data"]])
        print("  ⚠ User Stats — no Supabase key configured")
        return False

    hdrs = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    rows = []

    def sb_get(path):
        r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=hdrs, timeout=10)
        r.raise_for_status()
        return r.json()

    try:
        all_profiles = sb_get("profiles?select=id,plan,onboarding_completed,created_at")
        total = len(all_profiles)
        rows.append(["Total users", str(total), "All profiles rows", TODAY])

        plan_counts = {}
        for p in all_profiles:
            plan = p.get("plan") or "free"
            plan_counts[plan] = plan_counts.get(plan, 0) + 1

        for plan in ["free", "print", "pdf", "pro"]:
            count = plan_counts.get(plan, 0)
            label = "print (legacy pdf key)" if plan == "pdf" else plan
            rows.append([f"Plan: {label}", str(count), "", TODAY])

        paying = sum(v for k, v in plan_counts.items() if k != "free")
        rows.append(["Paying users total", str(paying), "pdf + print + pro", TODAY])

        if total > 0:
            conv = f"{paying / total * 100:.1f}%"
            rows.append(["Conversion rate (free→paid)", conv, f"{paying} of {total} users", TODAY])

        onboarded = sum(1 for p in all_profiles if p.get("onboarding_completed"))
        rows.append(["Onboarding completed", str(onboarded), f"of {total} total", TODAY])

        sorted_profiles = sorted(all_profiles, key=lambda x: x.get("created_at", ""), reverse=True)
        if sorted_profiles:
            last = sorted_profiles[0]["created_at"][:10]
            rows.append(["Latest signup date", last, "", TODAY])

    except Exception as e:
        rows.append(["Error", str(e)[:120], "", TODAY])

    headers = ["Metric", "Value", "Notes", "Last Updated"]
    ws.update([headers] + rows)

    reqs = [fmt_header(ws, 4), fmt_freeze(ws)]
    for i, row in enumerate(rows):
        metric, val = row[0], str(row[1])
        if "Error" in metric:
            color = _RED
        elif metric == "Paying users total" and val not in ("0", ""):
            color = _GREEN
        elif metric.startswith("Plan: print") and val not in ("0", ""):
            color = _GREEN
        elif metric == "Conversion rate (free→paid)":
            try:
                pct = float(val.replace("%", ""))
                color = _GREEN if pct > 5 else _AMBER
            except Exception:
                color = _WHITE
        else:
            color = _WHITE
        reqs.append(fmt_row_color(ws, i + 1, color, 4))
    reqs += fmt_col_widths(ws, [240, 100, 240, 130])
    sh.batch_update({"requests": reqs})
    print(f"  ✓ User Stats — {len(rows)} metrics")
    return True


# ── Tab 4: Onboarding QA ─────────────────────────────────────────────────────
def write_onboarding_qa(sh):
    ws = get_or_create_tab(sh, "✅ Onboarding QA", index=3)

    # Flow | Step | Expected | Status | Notes
    checklist = [
        # ── Signup ──────────────────────────────────────────────────────────
        ["Signup", "Navigate to /signup",
         "Form loads with email + password fields", "✅ CONFIRMED", "Tested 2026-05-23"],
        ["Signup", "Submit valid email + 8-char password",
         "Account created, redirect to onboarding flow", "✅ CONFIRMED", "Tested 2026-05-23 — cyrenachio+test1@gmail.com"],
        ["Signup", "Submit password < 8 chars",
         "Blocked with clear error message", "⚠️ TO TEST", ""],
        ["Signup", "Submit duplicate email",
         "Error: email already in use", "⚠️ TO TEST", ""],
        ["Signup", "Google OAuth — desktop",
         "Redirect to Google → returns to /dashboard", "⚠️ TO TEST", ""],
        ["Signup", "Google OAuth — mobile",
         "No ERR_FAILED — loads app correctly", "⚠️ TO TEST", "_redirects fix deployed commit 4b4a373"],

        # ── Onboarding flow ──────────────────────────────────────────────────
        ["Onboarding", "First login — PersonaliseFlow triggered",
         "Onboarding shown when onboarding_completed = false", "✅ CONFIRMED", "Tested 2026-05-23"],
        ["Onboarding", "Complete all onboarding steps",
         "profile.onboarding_completed = true in Supabase", "✅ CONFIRMED", "Tested 2026-05-23 — completed full flow"],
        ["Onboarding", "Second login — onboarding skipped",
         "Goes directly to /dashboard", "✅ CONFIRMED", "Tested 2026-05-23"],

        # ── Password reset ───────────────────────────────────────────────────
        ["Password Reset", "Submit forgot-password form",
         "Email arrives from hello@sprouttie.online", "✅ CONFIRMED", "Tested 2026-05-23 & 2026-05-24 — Supabase default SMTP"],
        ["Password Reset", "Email includes spam-folder note",
         "Footer tells user to check spam", "✅ CONFIRMED", "Added to Supabase recovery template"],
        ["Password Reset", "Click reset link in email",
         "/reset-password page loads with form", "✅ CONFIRMED", "Tested 2026-05-24 — email received and link verified on mobile"],
        ["Password Reset", "Submit new password (8+ chars)",
         "Password updated, redirect to /login", "✅ CONFIRMED", "Verified 2026-05-24"],
        ["Password Reset", "Submit password < 8 chars on reset page",
         "Blocked with error message", "✅ CONFIRMED", "Fixed commit 932772a — matches signup min"],

        # ── Stripe checkout ──────────────────────────────────────────────────
        ["Stripe Checkout", "Click Subscribe on Print Plan (free user)",
         "Redirected to Stripe Checkout page", "✅ CONFIRMED", "Tested 2026-05-23 — live checkout session created"],
        ["Stripe Checkout", "Complete payment in Stripe",
         "Redirect to /upgrade-success?plan=print", "✅ CONFIRMED", "Live payment tested 2026-05-23"],
        ["Stripe Checkout", "Plan updates after payment",
         "profile.plan = 'print' within ~10s of payment", "✅ CONFIRMED",
         "Verified 2026-05-23 — RPC stripe_update_profile (SECURITY DEFINER) bypasses RLS. Profile shows Print Plan SGD 3/mo"],
        ["Stripe Checkout", "Stripe webhook receives checkout.session.completed",
         "Edge fn logs: Updated user X to plan print", "✅ CONFIRMED",
         "Webhook v26 deployed 2026-05-23 11:35 UTC. RPC returned HTTP 204. Plan badge confirmed in app."],
        ["Stripe Checkout", "Plans page shows 'Current Plan' badge",
         "Print Plan card shows current state", "✅ CONFIRMED", "Verified 2026-05-23 — screenshot confirmed"],
        ["Stripe Checkout", "Downgrade to free",
         "Stripe customer portal opens, can cancel subscription", "✅ CONFIRMED",
         "Tested 2026-05-24 — 'Opening portal…' state shown, Stripe Billing portal loaded at billing.stripe.com"],
        ["Stripe Checkout", "After cancellation — plan reverts to free",
         "profile.plan = 'free' after subscription.deleted webhook", "⚠️ TO TEST", ""],

        # ── Core features ────────────────────────────────────────────────────
        ["Core Features", "Add a flashcard",
         "Card saved and appears in /cards", "✅ CONFIRMED", "Tested 2026-05-23"],
        ["Core Features", "Run a flash session",
         "Session logged and visible in /daily-tracking", "✅ CONFIRMED", "Tested 2026-05-23"],
        ["Core Features", "PDF export (Print plan user)",
         "PDF generated and downloaded successfully", "✅ CONFIRMED",
         "Tested 2026-05-24 — sprouttie-flashcards.pdf downloaded, preview rendered correctly"],
        ["Core Features", "PDF export (Free plan — 4th attempt this month)",
         "Blocked with upgrade prompt after 3 exports", "⚠️ TO TEST", "Limit enforcement"],
        ["Core Features", "Account deletion",
         "Profile deleted, session ended, redirect to /", "⚠️ TO TEST", "Implemented commit ffc964d"],

        # ── Mobile ───────────────────────────────────────────────────────────
        ["Mobile", "App loads on mobile browser",
         "No errors, responsive layout", "⚠️ TO TEST", ""],
        ["Mobile", "PWA install prompt",
         "Install to Home Screen banner appears", "✅ CONFIRMED",
         "Tested 2026-05-24 — /install page renders with Android steps (iOS steps gated to Safari UA)"],
        ["Mobile", "WhatsApp share preview",
         "Sprouttie mascot OG image shown (not Lovable logo)", "✅ CONFIRMED",
         "OG image fixed commit 1d7323b — sprouttie-og.png at sprouttie.online/images/sprouttie-og.png"],
    ]

    headers = ["Flow", "Step", "Expected", "Status", "Notes"]
    ws.update([headers] + checklist)

    status_colors = {
        "✅ CONFIRMED": _GREEN,
        "⚠️ TO TEST":  _AMBER,
        "❌ FAIL":      _RED,
    }
    reqs = [fmt_header(ws, 5), fmt_freeze(ws), fmt_wrap_top(ws, 1, len(checklist) + 1, 5)]
    for i, row in enumerate(checklist):
        reqs.append(fmt_row_color(ws, i + 1, status_colors.get(row[3], _WHITE), 5))
    reqs += fmt_col_widths(ws, [120, 280, 300, 120, 280])
    sh.batch_update({"requests": reqs})

    confirmed = sum(1 for r in checklist if r[3] == "✅ CONFIRMED")
    to_test   = sum(1 for r in checklist if r[3] == "⚠️ TO TEST")
    failed    = sum(1 for r in checklist if r[3] == "❌ FAIL")
    print(f"  ✓ Onboarding QA — {len(checklist)} steps  |  ✅ {confirmed} confirmed  ⚠️ {to_test} to test  ❌ {failed} fail")
    return True


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"\nSprouttie Sheet Sync — {TODAY}")
    print("=" * 52)

    try:
        sh = connect_sheet()
        print(f"  Connected: {sh.title}")
    except Exception as e:
        print(f"  ✗ Could not connect to Google Sheets: {e}")
        sys.exit(1)

    writers = [
        ("Launch Checklist", write_launch_checklist),
        ("Stripe Health",    write_stripe_health),
        ("User Stats",       write_user_stats),
        ("Onboarding QA",    write_onboarding_qa),
    ]

    results = {}
    for name, fn in writers:
        try:
            results[name] = fn(sh)
        except Exception as e:
            print(f"  ✗ {name}: {e}")
            results[name] = False

    print("=" * 52)
    passed = sum(1 for v in results.values() if v)
    print(f"  Done — {passed}/{len(results)} tabs written")
    print(f"  → https://docs.google.com/spreadsheets/d/{SHEET_ID}\n")


if __name__ == "__main__":
    main()
