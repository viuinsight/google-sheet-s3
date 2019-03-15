/**
 * @OnlyCurrentDoc
 */

/**
 * Adds add-on menu to Sheets UI.
 */
function createMenu() {
  SpreadsheetApp.getUi()
    .createAddonMenu() // when used as an Add-on
    // .createMenu("S3 JSON Publisher") // when directly added to Sheet
    .addItem("Configure...", "showConfig")
    .addItem("Publish Now", "publish")
    .addToUi();
}

/**
 * Adds menu on install.
 */
function onInstall() {
  createMenu();
}

/**
 * Adds menu on open.
 */
function onOpen() {
  createMenu();
}

/**
 * Publish updated JSON to S3 if changes were made to the first sheet event
 * object passed if called from trigger.
 *
 * @param {Object} event - event that triggered the function call
 */
function publish(event) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetId = sheet.getId();

  // do nothing if required configuration settings are not present
  if (!hasRequiredProps()) {
    Logger.log("Did not publish. Spreadsheet [" + sheetId
      + "] does not have required props set");
    return;
  }

  // do nothing if the edited sheet is not the first one -- sheets are indexed
  // from 1 instead of 0
  if (sheet.getActiveSheet().getIndex() > 1) {
    Logger.log("Did not publish. Spreadsheet [" + sheetId
      + "] first sheet was not modified.");
    return;
  }

  // get cell values from the range that contains data (2D array)
  var rows = sheet
    .getDataRange()
    .getValues();

  // filter out empty rows, then exclude columns that don't have a header (i.e.
  // text in row 1)
  rows = rows
    .filter(function(row) {
      return row.some(function(value) {
        return typeof value !== "string" || value.length;
      });
    })
    .map(function(row) {
      return row.filter(function(value, index) {
        return rows[0][index].length;
      });
    });

  // create an array of objects keyed by header
  var objs = rows
    .slice(1)
    .map(function(row) {
      var obj = {};
      row.forEach(function(value, index) {
        var prop = rows[0][index];
        // represent blank cell values as `null`
        // blank cells always appear as an empty string regardless of the data
        // type of other values in the column. neutralizing everything to `null`
        // lets us avoid mixing empty strings with other data types for a prop.
        obj[prop] = (typeof value === "string" && !value.length) ? null : value;
      });
      return obj;
    });

  // wrap array in object
  var content = {
    data: objs
  }

  // upload to S3
  // https://github.com/viuinsight/google-apps-script-for-aws
  var props = PropertiesService.getDocumentProperties().getProperties();
  try {
    AWS.S3.init(props.awsAccessKeyId, props.awsSecretKey);
    AWS.S3.putObject(props.bucketName, [props.path, sheetId].join("/"), content, props.region);
    Logger.log("Published Spreadsheet [" + sheetId + "]");
  } catch (e) {
    Logger.log("Did not publish. Spreadsheet [" + sheetId
      + "] generated following AWS error.\n" + e.toString());
  }
}

/**
 * Displays the configuration modal dialog.
 */
function showConfig() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getDocumentProperties().getProperties();
  var template = HtmlService.createTemplateFromFile("config");
  template.sheetId = sheet.getId();
  template.bucketName = props.bucketName || "";
  template.region = props.region || "";
  template.path = props.path || "";
  template.awsAccessKeyId = props.awsAccessKeyId || "";
  template.awsSecretKey = props.awsSecretKey || "";
  ui.showModalDialog(template.evaluate(), "Amazon S3 Publish Configuration");
}

/**
 * Submit action for the configuration modal dialog.
 *
 * @param {form} form - Web form that triggered the submit.
 */
function updateConfig(form) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetId = sheet.getId();
  PropertiesService.getDocumentProperties().setProperties({
    bucketName: form.bucketName,
    region: form.region,
    path: form.path,
    awsAccessKeyId: form.awsAccessKeyId,
    awsSecretKey: form.awsSecretKey
  });

  // Assume update will fail
  var title = "Configuration failed to update";
  var message;
  if (hasRequiredProps()) {
    title = "✓ Configuration updated";
    message = "Published spreadsheet will be accessible at: \nhttps://"
      + form.bucketName + ".s3.amazonaws.com/" + form.path + "/"
      + sheet.getId();
    publish();
    // Create an onChange trigger programatically instead of manually because
    // manual triggers disappear for no reason. See:
    // https://code.google.com/p/google-apps-script-issues/issues/detail?id=4854
    // https://code.google.com/p/google-apps-script-issues/issues/detail?id=5831
    try {
      ScriptApp.newTrigger("publish")
               .forSpreadsheet(sheet)
               .onChange()
               .create();
    } catch (e) {
      message = "Could not register event listener.\n" + e.toString();
      Logger.log("Could not register onChange event for Spreadsheet [" + sheetId
        + "]\n" + e.toString());
    }
  } else {
    message = "You will need to fill out all configuration options for your "
      + "spreadsheet to be published to S3.";
  }
  var ui = SpreadsheetApp.getUi();
  ui.alert(title, message, ui.ButtonSet.OK);
}

/**
 * Checks if the Sheet has the required configuration settings to publish to S3.
 * Does not validate the values, only ensures they are not empty.
 *
 * @return {boolean} true if all required properties are set, false otherwise.
 */
function hasRequiredProps() {
  var props = PropertiesService.getDocumentProperties().getProperties();
  return props.bucketName && props.region && props.awsAccessKeyId
    && props.awsSecretKey;
}
