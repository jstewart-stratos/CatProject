from flask import Flask, render_template, request, redirect, url_for, jsonify
import csv, json, os, re
from openpyxl import Workbook, load_workbook
from shutil import copy2
import xlwings as xw
import pandas as pd
import logging
from datetime import datetime
import math
from difflib import get_close_matches
from flask import flash
from flask import send_file
import warnings

warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl.worksheet._reader")


def fix_date(val):
    """Convert MM/DD/YYYY or M/D/YYYY to YYYY-MM-DD for HTML date inputs."""
    if not val:
        return ''
    val = str(val)
    try:
        # Only run if there's a slash and 2+ segments (i.e., not already YYYY-MM-DD)
        if '/' in val:
            return datetime.strptime(val, "%m/%d/%Y").strftime("%Y-%m-%d")
        return val  # already correct
    except Exception:
        return val

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s %(message)s"
)

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'a-very-secret-key'  # You can use any random string or generate one
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
CLIENT_CSV   = os.path.join(BASE_DIR, 'clients.csv')
ACCOUNT_CSV  = os.path.join(BASE_DIR, 'accounts.csv')
LISTS_JSON   = os.path.join(app.static_folder, 'list.json')
TEMPLATE_PATH = os.path.join(BASE_DIR, 'static', 'exportfile', 'templatelpl.xlsx')
MAPPING_PATH  = os.path.join(BASE_DIR, 'static', 'exportfile', 'exportmapping.xlsx')
LOCKED_XLSX   = os.path.join(BASE_DIR, 'locked_accounts.xlsx')
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOADS_DIR, exist_ok=True)
FUZZY_MATCH_CUTOFF = 0.95
# ─── Combined CSV config ───
COMBINED_CSV   = os.path.join(BASE_DIR, 'combined.csv')
COMBINED_FIELDS = [
'Client Index',
'Rep ID',
'Client Type',
'Account Type',
'Program Type',
'Registration Type',
'Advisor Fee',
'IRA Type',
'Entity Type',
'Entity Name',
'Decedent Name',
'TIN',
'Entity ID Type',
'Personal Information - SSN',
'Personal Information - First Name',
'Personal Information - Middle Name',
'Personal Information - Last Name',
'Personal Information - Alias',
'Personal Information - Date Of Birth',
'Personal Information - Signing Method',
'Contact Information - Legal Address 1',
'Contact Information - Legal Address 2',
'Contact Information - City',
'Contact Information - State',
'Contact Information - Zip Code',
'Personal Information - Citizenship / Legal Establishment',
'Personal Information - Residency Status',
'Contact Information - Mailing Address 1',
'Contact Information - Mailing Address 2',
'Contact Information - Mailing City',
'Contact Information - Mailing State',
'Contact Information - Mailing Zip Code',
'Contact Information - Home Phone',
'Contact Information - Mobile Phone',
'Contact Information - Business Phone',
'Contact Information - Email Address',
'Employment Information - Status',
'Employment Information - Employer Name',
'Employment Information - Industry',
'Employment Information - Industry Other',
'Employment Information - Occupation',
'Employment Information - Affiliation Type',
'Additional Holder - First Name',
'Additional Holder - Middle Name',
'Additional Holder - Last Name',
'Additional Holder - Alias',
'Additional Holder - SSN',
'Additional Holder - Date Of Birth',
'Additional Holder - Use Same Address As Primary',
'Additional Holder - Legal Address Line 1',
'Additional Holder - Legal Address Line 2',
'Additional Holder - City',
'Additional Holder - State',
'Additional Holder - Zip',
'Additional Holder - Citizenship / Legal Establishment',
'Additional Holder - Home Phone',
'Additional Holder - Mobile Phone',
'Additional Holder - Business Phone',
'Additional Holder - Email',
'Additional Holder - Employment Status',
'Additional Holder - Employer Name',
'Additional Holder - Industry',
'Additional Holder - Other Industry',
'Additional Holder - Occupation',
'Additional Holder - Exclude Employer Address',
'Additional Holder - Employer Address Line 1',
'Additional Holder - Employer Address Line 2',
'Additional Holder - Employer City',
'Additional Holder - Employer State',
'Additional Holder - Employer Zip',
'Additional Holder - Affiliation Type',
'Investment Objective',
'Suitability - Annual Income',
'Suitability - Net Worth',
'Suitability - Liquid Net Worth',
'Approximate Account Value',
'Expected Account Value',
'Suitability - Source of Wealth',
'Suitability - Source of Wealth Other',
'Suitability - Tax Bracket',
'Investment Time Horizon',
'Funds Needed In',
'hasInvestmentExperience',
'Investment Experience - Annuities',
'Investment Experience - Bonds',
'Investment Experience - Margin',
'Investment Experience - Mutual Funds',
'Investment Experience - Options',
'Investment Experience - Partnerships',
'Investment Experience - Stocks',
'Investment Experience - Other',
'Investment Experience - Other Description',
'Financial Information - Alt. Investments',
'Financial Information - Annuities',
'Financial Information - Bonds',
'Financial Information - Checking - Savings',
'Financial Information - Equities',
'Financial Information - Insurance',
'Financial Information - Mutual Funds',
'Financial Information - Real Estate',
'Financial Information - Other',
'Financial Information - Other Description',
'Beneficiaries[0][Type]',
'Beneficiaries[0][Relationship]',
'Beneficiaries[0][First Name]',
'Beneficiaries[0][Middle Name]',
'Beneficiaries[0][Last Name]',
'Beneficiaries[0][Entity Name]',
'Beneficiaries[0][Date Of Birth]',
'Beneficiaries[0][SSN]',
'Beneficiaries[0][Percentage]',
'Beneficiaries[1][Type]',
'Beneficiaries[1][Relationship]',
'Beneficiaries[1][First Name]',
'Beneficiaries[1][Middle Name]',
'Beneficiaries[1][Last Name]',
'Beneficiaries[1][Entity Name]',
'Beneficiaries[1][SSN]',
'Beneficiaries[1][Date Of Birth]',
'Beneficiaries[1][Percentage]',
'Beneficiaries[2][Type]',
'Beneficiaries[2][Relationship]',
'Beneficiaries[2][First Name]',
'Beneficiaries[2][Middle Name]',
'Beneficiaries[2][Last Name]',
'Beneficiaries[2][Entity Name]',
'Beneficiaries[2][SSN]',
'Beneficiaries[2][Date Of Birth]',
'Beneficiaries[2][Percentage]',
'Beneficiaries[3][Type]',
'Beneficiaries[3][Relationship]',
'Beneficiaries[3][First Name]',
'Beneficiaries[3][Middle Name]',
'Beneficiaries[3][Last Name]',
'Beneficiaries[3][Entity Name]',
'Beneficiaries[3][SSN]',
'Beneficiaries[3][Date Of Birth]',
'Beneficiaries[3][Percentage]',
'Beneficiaries[4][Type]',
'Beneficiaries[4][Relationship]',
'Beneficiaries[4][First Name]',
'Beneficiaries[4][Middle Name]',
'Beneficiaries[4][Last Name]',
'Beneficiaries[4][Entity Name]',
'Beneficiaries[4][SSN]',
'Beneficiaries[4][Date Of Birth]',
'Beneficiaries[4][Percentage]',
'Beneficiaries[5][Type]',
'Beneficiaries[5][Relationship]',
'Beneficiaries[5][First Name]',
'Beneficiaries[5][Middle Name]',
'Beneficiaries[5][Last Name]',
'Beneficiaries[5][Entity Name]',
'Beneficiaries[5][SSN]',
'Beneficiaries[5][Date Of Birth]',
'Beneficiaries[5][Percentage]',
'Advisor Fee',
'Advisory Billing Cycle',
'Notes',
'Trusted Contact - First Name',
'Trusted Contact - Last Name',
'Trusted Contact - Relationship',
'Trusted Contact - Street Address 1',
'Trusted Contact - Street Address 2',
'Trusted Contact - City',
'Trusted Contact - State',
'Trusted Contact - Zip Code',
'Trusted Contact - Email Address',
'Trusted Contact - Phone Number',
'Delivering Firm',
'Contra Account #',
'Transfer on Death (TOD)',
'Beneficiary IRA Details - Decedent Name',
'Beneficiary IRA Details - Date Of Death',
'Beneficiary IRA Details - Distribution Types',
'Checkwriting',
'Checkwriting Account Type',
'Debit Card',
'Cost Basis Reporting',
'Power Of Attorney',
'POA Authorized Agent Name',
'POA Agent Existing Client',
'Trading Authority',
'TA Authorized Agent Name',
'Trading Agent Existing Client',
'Trading Authorization Type',
'Full Discretionary Trading',
'Add Margin',
'Structured Product Trading',
'Complex ETP Trading',
'Options Trading',
'Options Level',
'Name of Product Sponsor & 529 Plan',
'Investment Portfolio / Option Chosen',
'Owner State of Residence',
'Source of Funds',
'Share Class',
'Plan Administrator',
'Trust Formation State',
'Trust Type',
'Grantor/Decedent Name(s)',
'Created By',
'ACH[0][Bank Name]',
'ACH[0][Account Type]',
'ACH[0][Routing Number]',
'ACH[0][Bank Account Number]',
'ACH[0][Bank Account Registration]',
'ACH[0][On Demand]',
'ACH[0][Periodic]',
'ACH[1][Bank Name]',
'ACH[1][Account Type]',
'ACH[1][Routing Number]',
'ACH[1][Bank Account Number]',
'ACH[1][Bank Account Registration]',
'ACH[1][On Demand]',
'ACH[1][Periodic]',
'ACH[2][Bank Name]',
'ACH[2][Account Type]',
'ACH[2][Routing Number]',
'ACH[2][Bank Account Number]',
'ACH[2][Bank Account Registration]',
'ACH[2][On Demand]',
'ACH[2][Periodic]',
'DirectBusiness[0][Type of Account]',
'DirectBusiness[0][Full Name of Sponsor]',
'DirectBusiness[0][Product Name]',
'DirectBusiness[0][Account or Contract/Policy Number]',
'DirectBusiness[1][Type of Account]',
'DirectBusiness[1][Full Name of Sponsor]',
'DirectBusiness[1][Product Name]',
'DirectBusiness[1][Account or Contract/Policy Number]',
'DirectBusiness[2][Type of Account]',
'DirectBusiness[2][Full Name of Sponsor]',
'DirectBusiness[2][Product Name]',
'DirectBusiness[2][Account or Contract/Policy Number]',
'DirectBusiness[3][Type of Account]',
'DirectBusiness[3][Full Name of Sponsor]',
'DirectBusiness[3][Product Name]',
'DirectBusiness[3][Account or Contract/Policy Number]',
'DirectBusiness[4][Type of Account]',
'DirectBusiness[4][Full Name of Sponsor]',
'DirectBusiness[4][Product Name]',
'DirectBusiness[4][Account or Contract/Policy Number]',
'Trust Formation State',
'Trust Type',
'Grantor/Decedent Name(s)',
'Created By',
'Trust Date',
'Locked',

]
CLIENT_FIELDS = [
'Client Type',
'Entity Type',
'Entity Name',
'Decedent Name',
'TIN',
'Entity ID Type',
'Personal Information - SSN',
'Personal Information - First Name',
'Personal Information - Middle Name',
'Personal Information - Last Name',
'Personal Information - Alias',
'Personal Information - Date Of Birth',
'Personal Information - Signing Method',
'Contact Information - Legal Address 1',
'Contact Information - Legal Address 2',
'Contact Information - City',
'Contact Information - State',
'Contact Information - Zip Code',
'Personal Information - Citizenship / Legal Establishment',
'Personal Information - Residency Status',
'Contact Information - Mailing Address 1',
'Contact Information - Mailing Address 2',
'Contact Information - Mailing City',
'Contact Information - Mailing State',
'Contact Information - Mailing Zip Code',
'Contact Information - Home Phone',
'Contact Information - Mobile Phone',
'Contact Information - Business Phone',
'Contact Information - Email Address',
'Employment Information - Status',
'Employment Information - Employer Name',
'Employment Information - Industry',
'Employment Information - Industry Other',
'Employment Information - Occupation',
'Employment Information - Affiliation Type',
'Suitability - Annual Income',
'Suitability - Net Worth',
'Suitability - Liquid Net Worth',
'Suitability - Source of Wealth',
'Suitability - Source of Wealth Other',
'Suitability - Tax Bracket',
'hasInvestmentExperience',
'Investment Experience - Annuities',
'Investment Experience - Bonds',
'Investment Experience - Margin',
'Investment Experience - Mutual Funds',
'Investment Experience - Options',
'Investment Experience - Partnerships',
'Investment Experience - Stocks',
'Investment Experience - Other',
'Investment Experience - Other Description',
'hasOtherInvestments',
'Financial Information - Alt. Investments',
'Financial Information - Annuities',
'Financial Information - Bonds',
'Financial Information - Checking - Savings',
'Financial Information - Equities',
'Financial Information - Insurance',
'Financial Information - Mutual Funds',
'Financial Information - Real Estate',
'Financial Information - Other',
'Financial Information - Other Description',
'Trusted Contact - First Name',
'Trusted Contact - Last Name',
'Trusted Contact - Relationship',
'Trusted Contact - Street Address 1',
'Trusted Contact - Street Address 2',
'Trusted Contact - City',
'Trusted Contact - State',
'Trusted Contact - Zip Code',
'Trusted Contact - Email Address',
'Trusted Contact - Phone Number',

]
def load_csv(path):
    """Load a CSV file into a list of dicts. If missing, return []."""
    if not os.path.exists(path):
        return []
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

def write_csv(path, rows, fieldnames):
    """Overwrite CSV at `path` with given rows and headers."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

def rebuild_combined_csv(reason=""):
    """
    Overwrite combined.csv by merging clients + accounts on Client Index,
    writing only the columns in COMBINED_FIELDS.
    """
    clients  = load_csv(CLIENT_CSV)
    accounts = load_csv(ACCOUNT_CSV)

    combined_rows = []
    for idx, client in enumerate(clients):
        idx_str = str(idx)
        for acct in accounts:
            if acct.get("Client Index","").strip() != idx_str:
                continue
            merged = {**client, **acct}
            row    = {col: merged.get(col,"") for col in COMBINED_FIELDS}
            combined_rows.append(row)

    write_csv(COMBINED_CSV, combined_rows, fieldnames=COMBINED_FIELDS)
    print(f"[rebuild_combined_csv] {reason}: wrote {len(combined_rows)} rows")

def ensure_locked(rows):
    """Ensure every row dict has a 'Locked' key (default 'False')."""
    for r in rows:
        r.setdefault('Locked','False')
    return rows

def load_sheet_mapping(mapping_path):
    """
    Reads the first tab of exportmapping.xlsx and returns a dict:
      {
        'Data': {'FormKey': [(cond, 'A'), …], …},
        'ACH':  { … }, …
      }
    If there’s no header literally called 'Condition', it will
    use the 4th column by position as the condition column.
    """
    # 1) read everything as strings
    df = pd.read_excel(mapping_path, sheet_name=0, dtype=str)

    # 2) normalize column names
    df.columns = [c.strip() for c in df.columns]

    # 3) pick your key columns
    required = ['Sheet', 'FormFieldKey', 'Column']
    for col in required:
        if col not in df.columns:
            raise RuntimeError(f"Mapping file missing required column '{col}'. Found: {df.columns.tolist()}")

    # 4) find or fallback the Condition column
    if 'Condition' in df.columns:
        cond_col = 'Condition'
    else:
        # assume the next column after 'Column' is your condition
        col_idx = df.columns.get_loc('Column')
        cond_col = df.columns[col_idx+1] if col_idx+1 < len(df.columns) else None

    # 5) fillna so .strip() is safe
    df = df.fillna('')

    sheet_field_map = {}
    for _, row in df.iterrows():
        sheet = row['Sheet'].strip()
        key   = row['FormFieldKey'].strip()
        col   = row['Column'].strip()
        # if we found a condition column, grab it; else default to always write
        rawcond = row[cond_col] if cond_col else ''
        cond    = rawcond.strip().lower() or None

        if not (sheet and key and col):
            continue

        sf = sheet_field_map.setdefault(sheet, {})
        sf.setdefault(key, []).append((cond, col))

    return sheet_field_map
# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.route('/')
@app.route('/clients')
def list_clients():
    rebuild_combined_csv(reason="on /clients")
    clients  = load_csv(CLIENT_CSV)
    accounts = load_csv(ACCOUNT_CSV)

    enriched = []
    for idx, client in enumerate(clients):
        cnt = sum(1 for a in accounts if a.get('Client Index','')==str(idx))
        c2  = dict(client, **{'Account Count': cnt})
        enriched.append(c2)

    # ✅ Add this line
    locked_file_exists = os.path.exists(LOCKED_XLSX)

    # ✅ Pass it to the template
    return render_template('clients.html.j2', clients=enriched, show_locked_download=locked_file_exists)

@app.route('/lists')
def lists():
    with open(LISTS_JSON, encoding='utf-8') as f:
        return jsonify(json.load(f))

# ─── CLIENT CRUD ───────────────────────────────────────────────────────────────

@app.route('/clients/new')
def new_client():
    return render_template('index.html.j2')

@app.route('/submit', methods=['POST'])
def submit_client():
    client = request.form.to_dict()
    clients = load_csv(CLIENT_CSV)
    clients.append(client)

    all_fields = sorted({k for c in clients for k in c.keys()})
    write_csv(CLIENT_CSV, clients, fieldnames=all_fields)
#    print('Saving:', client.get('Trusted Contact - State', 'NOT SET'))

    rebuild_combined_csv(reason="after adding client")
    return redirect(url_for('list_clients'))

@app.route('/clients/<int:idx>/edit', methods=['GET','POST'])
def edit_client(idx):
    clients = load_csv(CLIENT_CSV)
    if idx<0 or idx>=len(clients):
        return redirect(url_for('list_clients'))
    client = clients[idx]
    read_only = (client.get('Locked','False')=='True')
    # Fix date fields for HTML <input type="date">
    for field in [
        "Personal Information - Date Of Birth",
        "Additional Holder - Date Of Birth",
        # Add any others you use!
    ]:
        if field in client:
            client[field] = fix_date(client[field])
    if request.method=='POST' and not read_only:
        updated = request.form.to_dict()
        # clear entity‐only fields for Individuals
        if updated.get('Client Type')=='Individual':
            for fld in ['Entity Name','Entity Type','Entity ID Type','TIN','Decedent Name']:
                updated[fld] = ''
        # preserve missing keys
        for k,v in client.items():
            updated.setdefault(k,v)
        clients[idx] = updated
#        print('INCOMING FORM:', request.form.get('Trusted Contact - State'))
#        print('LOADED:', client.get('Trusted Contact - State'))

        all_fields = sorted({k for c in clients for k in c.keys()})
        write_csv(CLIENT_CSV, clients, fieldnames=all_fields)
        rebuild_combined_csv(reason=f"after editing client {idx}")
        return redirect(url_for('list_clients'))

    # NEW: Calculate number of accounts for this client
    all_accounts = load_csv(ACCOUNT_CSV)
    account_count = sum(1 for acct in all_accounts if acct.get('Client Index', '') == str(idx))

    return render_template(
        'edit_client.html.j2',
        client=client,
        idx=idx,
        read_only=read_only,
        account_count=account_count  # <--- this line is the fix!
    )

@app.route('/clients/<int:idx>/delete', methods=['POST'])
def delete_client(idx):
    clients = load_csv(CLIENT_CSV)
    if 0 <= idx < len(clients):
        client_id = str(idx)
        del clients[idx]
        fields = sorted({k for c in clients for k in c.keys()})
        write_csv(CLIENT_CSV, clients, fieldnames=fields)

        # remove associated accounts
        accts = [a for a in load_csv(ACCOUNT_CSV)
                 if a.get('Client Index','') != client_id]
        acct_fields = sorted({k for a in accts for k in a.keys()})
        write_csv(ACCOUNT_CSV, accts, fieldnames=acct_fields)

        rebuild_combined_csv(reason=f"after deleting client {idx}")

    return redirect(url_for('list_clients'))

# ─── ACCOUNT CRUD ──────────────────────────────────────────────────────────

# 1) CREATE  ───────────────────────────────────────────────────────────────
@app.route('/clients/<int:idx>/accounts/new', methods=['GET', 'POST'])
def new_account(idx: int):
    clients = load_csv(CLIENT_CSV)
    if idx < 0 or idx >= len(clients):
        return redirect(url_for('list_clients'))

    if request.method == 'POST':
        new_row = request.form.to_dict()
        new_row['Client Index'] = str(idx)

        accounts = load_csv(ACCOUNT_CSV)
        accounts.append(new_row)
        fieldnames = sorted({k for r in accounts for k in r})
        write_csv(ACCOUNT_CSV, accounts, fieldnames=fieldnames)
        rebuild_combined_csv(reason=f"new account for client {idx}")

        return redirect(url_for('manage_accounts', idx=idx))

    # GET  → empty form
    return render_template(
        'new_account.html.j2',
        mode='new',
        idx=idx,
        client=clients[idx],
        account={},                 # blank dict for template
        read_only=False,
        form_action=url_for('new_account', idx=idx)
    )

# 2) LIST  ─────────────────────────────────────────────────────────────────
@app.route('/clients/<int:idx>/accounts', methods=['GET'])
def manage_accounts(idx: int):
    clients = load_csv(CLIENT_CSV)
    if idx < 0 or idx >= len(clients):
        return redirect(url_for('list_clients'))

    client       = clients[idx]
    client_accts = [a for a in load_csv(ACCOUNT_CSV) if a.get('Client Index', '') == str(idx)]
    return render_template('accounts.html.j2', client=client, accounts=client_accts, idx=idx)

# 3) EDIT  ────────────────────────────────────────────────────────────────
@app.route('/clients/<int:idx>/accounts/<int:acct_idx>/edit', methods=['GET', 'POST'])
def edit_account(idx: int, acct_idx: int):
    clients = load_csv(CLIENT_CSV)
    if idx < 0 or idx >= len(clients):
        return redirect(url_for('list_clients'))

    accounts_all = load_csv(ACCOUNT_CSV)
    client_accts = [a for a in accounts_all if a.get('Client Index', '') == str(idx)]
    if acct_idx < 0 or acct_idx >= len(client_accts):
        return redirect(url_for('manage_accounts', idx=idx))

    acct_row  = client_accts[acct_idx]
    read_only = acct_row.get('Locked', 'False') == 'True'

    if request.method == 'POST' and not read_only:
        updated               = request.form.to_dict()
        updated['Client Index'] = str(idx)

        abs_pos = next(i for i, r in enumerate(accounts_all) if r is acct_row)
        accounts_all[abs_pos] = updated
        fieldnames = sorted({k for r in accounts_all for k in r})
        write_csv(ACCOUNT_CSV, accounts_all, fieldnames=fieldnames)
        rebuild_combined_csv(reason=f"edit acct {acct_idx} for client {idx}")
        return redirect(url_for('manage_accounts', idx=idx))

    # GET  → pre-filled form
    return render_template(
        'new_account.html.j2',          # reuse the same template
        mode='edit',
        idx=idx,
        acct_idx=acct_idx,
        client=clients[idx],
        account=acct_row,
        read_only=read_only,
        form_action=url_for('edit_account', idx=idx, acct_idx=acct_idx)
    )

# 4) DELETE  (unchanged) ──────────────────────────────────────────────────
@app.route('/clients/<int:idx>/accounts/<int:acct_idx>/delete', methods=['POST'])
def delete_account(idx: int, acct_idx: int):
    all_accounts = load_csv(ACCOUNT_CSV)
    client_accts = [a for a in all_accounts if a.get('Client Index', '') == str(idx)]
    if 0 <= acct_idx < len(client_accts):
        abs_pos = next(i for i, r in enumerate(all_accounts) if r is client_accts[acct_idx])
        del all_accounts[abs_pos]
        fieldnames = sorted({k for r in all_accounts for k in r})
        write_csv(ACCOUNT_CSV, all_accounts, fieldnames=fieldnames)
        rebuild_combined_csv(reason=f"delete acct {acct_idx} for client {idx}")
    return redirect(url_for('manage_accounts', idx=idx))
# ─── LOCK / UNLOCK ─────────────────────────────────────────────────────────────
@app.route('/lock_clients', methods=['POST'])
def lock_clients():
    import logging
    import xlwings as xw

    logging.debug("🔒 /lock_clients called")

    # Load clients/accounts with 'Locked' defaulted
    clients  = ensure_locked(load_csv(CLIENT_CSV))
    accounts = ensure_locked(load_csv(ACCOUNT_CSV))
    to_lock  = request.form.getlist('selected_clients')

    logging.debug(f"Selected client indexes: {to_lock}")
    new_locked = []

    for s in to_lock:
        try:
            idx = int(s)
        except ValueError:
            continue
        if 0 <= idx < len(clients):
            clients[idx]['Locked'] = 'True'
            client_id = str(idx)
            for acct in accounts:
                acct_index = str(acct.get('Client Index', '')).strip()
                if acct_index == client_id:
                    acct['Locked'] = 'True'
                    new_locked.append({**clients[idx], **acct})
                    logging.debug(f"✅ Locked account for client {client_id}")

    # Persist updated CSVs
    write_csv(CLIENT_CSV, clients, fieldnames=sorted({k for c in clients for k in c}))
    write_csv(ACCOUNT_CSV, accounts, fieldnames=sorted({k for a in accounts for k in a}))
    rebuild_combined_csv(reason="after locking clients")

    if not new_locked:
        flash("⚠️ No accounts matched the selected clients. Nothing was locked.", "error")
        logging.warning("⚠️ new_locked is empty — skipping Excel generation.")
        return redirect(url_for('list_clients'))

    logging.debug(f"🔐 Proceeding to Excel generation with {len(new_locked)} rows")

    # Ensure locked_accounts.xlsx exists
    if not os.path.exists(LOCKED_XLSX):
        copy2(TEMPLATE_PATH, LOCKED_XLSX)
        logging.debug(f"📄 Copied template → {LOCKED_XLSX}")

    # Load field mappings
    sheet_map = load_sheet_mapping(MAPPING_PATH)
    logging.debug(f"Mapping sheets: {list(sheet_map.keys())}")

    try:
        app_xl = xw.App(visible=False)
        for prop in ("DisplayAlerts", "EnableEvents", "ScreenUpdating"):
            try:
                setattr(app_xl.api, prop, False)
            except Exception as e:
                logging.warning(f"⚠️ Could not disable {prop}: {e}")

        wb = app_xl.books.open(LOCKED_XLSX)
        sheets_in_file = [sh.name for sh in wb.sheets]
        logging.debug(f"Workbook sheets: {sheets_in_file}")

        # Compute next available row per sheet
        next_row = {}
        XL_CELL_TYPE_CONSTANTS = 2
        for sheet_name, field_map in sheet_map.items():
            if sheet_name not in sheets_in_file:
                logging.warning(f"❌ Sheet '{sheet_name}' missing; skipping")
                continue
            sht = wb.sheets[sheet_name]
            mapped_cols = {col for conds in field_map.values() for (_, col) in conds}
            last_data = 2
            for col in mapped_cols:
                try:
                    consts = sht.api.Columns(col).SpecialCells(XL_CELL_TYPE_CONSTANTS)
                    for i in range(1, consts.Areas.Count + 1):
                        area = consts.Areas(i)
                        r0 = area.Row + area.Rows.Count - 1
                        last_data = max(last_data, r0)
                except:
                    continue
            next_row[sheet_name] = last_data + 1
            logging.debug(f"[{sheet_name}] next row = {next_row[sheet_name]}")

        # Write rows into workbook
        for merged in new_locked:
            for sheet_name, field_map in sheet_map.items():
                if sheet_name not in next_row:
                    continue
                sht = wb.sheets[sheet_name]
                row = next_row[sheet_name]
                logging.debug(f"[{sheet_name}] writing → row {row}")
                for form_key, conds in field_map.items():
                    raw = merged.get(form_key, "")
                    low = str(raw).strip().lower()
                    for cond, col in conds:
                        if cond is None or cond == low:
                            try:
                                n = float(raw)
                                val = int(n) if n.is_integer() else n
                            except:
                                val = raw
                            sht.api.Range(f"{col}{row}").Value = val
                            logging.debug(f" → {col}{row} = {val!r}")

                if sheet_name == "Data":
                    r_rng = sht.api.Range(f"R{row}")
                    y_rng = sht.api.Range(f"Y{row}")
                    x_rng = sht.api.Range(f"X{row}")
                    if r_rng.Value == y_rng.Value:
                        x_rng.Value = "Yes"
                        sht.api.Range(f"Y{row}:AC{row}").ClearContents()
                    else:
                        x_rng.Value = "No"

                    bc_rng = sht.api.Range(f"BC{row}")
                    bc_val = str(bc_rng.Value or "").strip().lower()
                    bc_rng.Value = "Yes" if bc_val == "on" else "No"
                    sht.api.Range(f"CP{row}").Formula = f"=SUM(CQ{row}:CX{row})"

                next_row[sheet_name] += 1

        wb.save()
        wb.close()
        app_xl.quit()
        logging.debug("✅ locked_accounts.xlsx updated and closed")

    except Exception as e:
        logging.exception("❌ Failed during Excel export:")
        flash(f"❌ Error during Excel generation: {e}", "error")
        return redirect(url_for('list_clients'))

    flash("✅ Selected clients and accounts have been locked and submitted to Stratos Onboarding successfully.")
    return redirect(url_for('list_clients'))



@app.route('/unlock_clients', methods=['POST'])
def unlock_clients():
    clients  = ensure_locked(load_csv(CLIENT_CSV))
    accounts = ensure_locked(load_csv(ACCOUNT_CSV))

    to_unlock = request.form.getlist('selected_clients')
    for s in to_unlock:
        try:
            i = int(s)
        except ValueError:
            continue

        if 0 <= i < len(clients):
            clients[i]['Locked'] = 'False'
        for acct in accounts:
            if acct.get('Client Index','') == s:
                acct['Locked'] = 'False'

    write_csv(
      CLIENT_CSV,
      clients,
      fieldnames=sorted({k for c in clients  for k in c.keys()})
    )
    write_csv(
      ACCOUNT_CSV,
      accounts,
      fieldnames=sorted({k for a in accounts for k in a.keys()})
    )

    rebuild_combined_csv(reason="after unlocking clients")

    return redirect(url_for('list_clients'))

#Upload CSV
@app.route('/clients/upload_csv', methods=['GET', 'POST'])
def upload_clients_csv():
    import pandas as pd
    from difflib import get_close_matches

    if request.method == 'POST':
        file = request.files.get('csv')
        if not file or not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
            return render_template('upload_clients_csv.html.j2', error="Please upload a valid CSV or Excel file.")

        filepath = os.path.join(UPLOADS_DIR, file.filename)
        file.save(filepath)

        # Extract headers based on file type
        try:
            if file.filename.lower().endswith('.csv'):
                df = pd.read_csv(filepath, nrows=0, keep_default_na=False)
            else:
                df = pd.read_excel(filepath, nrows=0, keep_default_na=False)
            headers = list(df.columns)
        except Exception as e:
            return render_template('upload_clients_csv.html.j2', error=f"Error parsing file: {e}")

        # Auto-map headers to COMBINED_FIELDS where possible
        automap = {}
        for field in CLIENT_FIELDS:
            matches = get_close_matches(field, headers, n=1, cutoff=FUZZY_MATCH_CUTOFF)
            automap[field] = matches[0] if matches else ''

        return render_template('remap_clients_csv.html.j2', headers=headers, automap=automap, csvfile=file.filename)

    return render_template('upload_clients_csv.html.j2')
#Map clients
@app.route('/clients/save_from_csv', methods=['POST'])
def save_clients_from_csv():
    import pandas as pd
    import datetime

    def make_client_key(client):
        ssn = client.get('Personal Information - SSN', '').strip()
        client_type = client.get('Client Type', '').strip().lower()
        entity_name = (client.get('Entity Name') or '').strip().lower()
        decedent_name = (client.get('Decedent Name') or '').strip().lower()

        # Construct full name
        full_name = ' '.join([
            client.get('Personal Information - First Name', '').strip().lower(),
            client.get('Personal Information - Middle Name', '').strip().lower(),
            client.get('Personal Information - Last Name', '').strip().lower()
        ]).strip()
        dob = client.get('Personal Information - Date Of Birth', '').strip()

        # Primary: SSN + Client Type + (Entity or Decedent)
        if ssn:
            return (ssn, client_type, entity_name or decedent_name)
        # Secondary: Name + DOB + Client Type
        elif full_name and dob:
            return (full_name, dob, client_type)
        # Tertiary: Entity/Decedent Name + Client Type
        elif entity_name or decedent_name:
            return (client_type, entity_name or decedent_name)
        # Last resort
        return (full_name, client_type)

    csvfile = request.form['csvfile']

    # Build mapping dict from all keys like 'map[FieldName]'
    mapping = {}
    for key, value in request.form.items():
        if key.startswith('map[') and key.endswith(']'):
            field = key[4:-1]
            mapping[field] = value

    filepath = os.path.join(UPLOADS_DIR, csvfile)

    # Detect file type and read appropriately
    if csvfile.lower().endswith('.csv'):
        df = pd.read_csv(filepath, keep_default_na=False)
    else:
        df = pd.read_excel(filepath, keep_default_na=False)

    # Load existing clients and index them
    existing_clients = load_csv(CLIENT_CSV)
    client_index = {make_client_key(c): c for c in existing_clients}

    # Process uploaded rows
    for _, row in df.iterrows():
        client = {}
        for field, col in mapping.items():
            if col and col in row:
                val = row[col]
            #    print(f'RAW [{field} / {col}]: {repr(val)}')
                if pd.isna(val):
                    val_str = ''
                elif isinstance(val, (datetime.date, datetime.datetime, pd.Timestamp)):
                    val_str = val.strftime('%Y-%m-%d')
                else:
                    val_str = str(val)
                    if val_str.endswith('.0') and val_str.replace('.0', '').isdigit():
                        val_str = val_str[:-2]
                client[field] = val_str
            #    if field == 'Trusted Contact - State':
            #        print('✅ Final State:', val_str)

        key = make_client_key(client)
        if key not in client_index:
            client_index[key] = client
        else:
            print(f'⚠️ Skipped duplicate client for key: {key}')

    final_clients = list(client_index.values())
    all_fields = sorted({k for c in final_clients for k in c.keys()})
    write_csv(CLIENT_CSV, final_clients, fieldnames=all_fields)
#    print('✅ Fields to write:', all_fields)

    rebuild_combined_csv(reason="after CSV import")
    return redirect(url_for('list_clients'))

@app.route('/download_locked')
def download_locked():
    if not os.path.exists(LOCKED_XLSX):
        return "Locked accounts file not found.", 404

    from openpyxl import load_workbook
    from datetime import datetime

    rep_id = None

    try:
        wb = load_workbook(LOCKED_XLSX, data_only=True)
        if "Data" in wb.sheetnames:
            ws = wb["Data"]
            # Start scanning column B at row 3
            for row in ws.iter_rows(min_row=3, max_col=2, min_col=2):
                val = row[0].value
                if val:
                    rep_id = str(val).strip()
                    break
        wb.close()
    except Exception as e:
        import logging
        logging.warning(f"Could not read Rep ID from Excel: {e}")

    today_str = datetime.today().strftime('%y%m%d')
    safe_rep = rep_id.replace(" ", "").replace("/", "").replace("\\", "")[:15] if rep_id else ""
    filename = f"{safe_rep + '-' if safe_rep else ''}AccountBulkUpload-{today_str}.xlsx"

    return send_file(
        LOCKED_XLSX,
        as_attachment=True,
        download_name=filename
    )

if __name__ == '__main__':
    rebuild_combined_csv(reason="(initial startup)")
    os.chdir(BASE_DIR)
    app.run(host='127.0.0.1', port=5000, debug=True)
#    app.run(host='0.0.0.0', port=5000, debug=False)