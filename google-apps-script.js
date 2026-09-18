/**
 * PROPVIGIL - Google Sheet Form Integration Script
 * Spreadsheet ID: 1YcITIKji8K8e4g75OdVLcK5PQfsBqd5XLjwxlnmJme0
 * Sheet Tab: Sheet1
 *
 * Appends form submissions as new rows:
 * [Timestamp, Name, WhatsApp Number, What Do You Own, Location, Size, Additional Details, Status]
 */

function doPost(e) {
  return handleFormSubmission(e);
}

function doGet(e) {
  // Enables testing via browser GET URL parameters or health checks
  if (e && e.parameter && (e.parameter.name || e.parameter.phone)) {
    return handleFormSubmission(e);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    message: "PropVigil Google Sheets Intake Webhook is running."
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleFormSubmission(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 10 seconds for concurrent submissions to prevent race conditions
  lock.tryLock(10000);

  try {
    var SPREADSHEET_ID = "1YcITIKji8K8e4g75OdVLcK5PQfsBqd5XLjwxlnmJme0";
    var SHEET_NAME = "Sheet1";

    var ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    // Ensure header row exists with required column structure
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Name",
        "WhatsApp Number",
        "What Do You Own",
        "Location",
        "Size",
        "Additional Details",
        "Status"
      ]);
      // Format header row style
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#0B192C").setFontColor("#FFFFFF");
    }

    // Explicitly set column C (WhatsApp Number) number format to plain text '@'
    var lastRow = Math.max(sheet.getLastRow(), 1);
    sheet.getRange(1, 3, lastRow, 1).setNumberFormat("@");

    var data = {};

    // 1. Parse JSON payload if sent via application/json or raw text
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // 2. Format Timestamp in Indian Standard Time (IST)
    var timestamp = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy HH:mm:ss");

    // 3. Extract and normalize fields
    var name = (data.name || data.Name || "").toString().trim();
    var rawPhone = (data.phone || data.WhatsApp_Number || data.whatsapp || data["WhatsApp Number"] || data.phone_number || "").toString().trim();
    var whatDoYouOwn = (data.prop_type || data.what_do_you_own || data["What Do You Own"] || data.Property_Owned || "").toString().trim();
    var location = (data.location || data.Location || data.Property_Location || "").toString().trim();
    var size = (data.size || data.Size || data.Property_Size || "").toString().trim();
    var notes = (data.notes || data.additional_details || data["Additional Details"] || data.Additional_Notes || "").toString().trim();
    var status = "New"; // Required status

    // 4. Safely handle WhatsApp Number:
    // Google Sheets interprets leading '+' as a mathematical formula (e.g. =+91 ...), causing '#ERROR!'.
    // Prepending a single quote (') forces Google Sheets to store it strictly as a plain text literal,
    // preserving the leading '+', country codes, and spaces without formula evaluation.
    var safePhone = rawPhone;
    if (safePhone && !safePhone.startsWith("'")) {
      safePhone = "'" + safePhone;
    }

    // 5. Append row to Sheet1
    sheet.appendRow([
      timestamp,
      name,
      safePhone,
      whatDoYouOwn,
      location,
      size,
      notes,
      status
    ]);

    // Ensure the new cell in Column 3 is formatted as plain text
    var newRowIdx = sheet.getLastRow();
    sheet.getRange(newRowIdx, 3).setNumberFormat("@");

    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      message: "Row successfully added to Sheet1",
      row: {
        timestamp: timestamp,
        name: name,
        phone: rawPhone,
        whatDoYouOwn: whatDoYouOwn,
        location: location,
        size: size,
        notes: notes,
        status: status
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
