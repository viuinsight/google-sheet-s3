# <img src="https://github.com/viuinsight/google-sheets-to-s3/blob/master/img/icon.png?raw=true" alt="logo" width="64px" /> google-sheets-to-s3

[Google Apps Script](https://developers.google.com/apps-script/) that publishes a Google Sheet to Amazon S3 as a JSON file. Auto-updates on edit & maintains data types. Creates an array of objects keyed by column header.

Turn a spreadsheet like this:

![spreadsheet](http://i.imgur.com/9k7tY91.png)

Into an auto-updating JSON file like this:

![JSON object](http://i.imgur.com/FahoMx4.png)

Get the add-on [here on the Chrome Web Store](https://chrome.google.com/webstore/detail/s3-json-publisher/mdflfaifaifehmcgmjkbdcdgngoohlld).

## Why?

### Use case

"I want to manage simple, structured, data in an easily updatable way (possibly by multiple people at once) that can be published for use by other systems without the overhead and time of coding, deploying, and maintaining a full-blown web application."

### Examples

Staff directory list, restaurant menu items listing, sports team standings page, etc.

## Why not [alternative]?

- Doesn't require OAuth like the [official Google Sheets API](https://developers.google.com/sheets/guides/authorizing) (no good for anonymous data viewing).
- Not using [deprecated APIs](https://developers.google.com/gdata/samples/spreadsheet_sample) like [Tabletop.js](https://github.com/jsoma/tabletop) that could suffer an untimely disappearance at the whims of Google.
- Doesn't require an intermediary web application like [WSJ uses/used](https://gist.github.com/jsvine/3295633).
- Not an alternative service like [Airtable](https://airtable.com) or [Fieldbook](https://fieldbook.com) that is powerful but costs 💰💰💰.
- Not slow at returning data like [Google Apps Script Web Apps](http://pipetree.com/qmacro/blog/2013/10/sheetasjson-google-spreadsheet-data-as-json/
) seem to be. (If you're okay with 2000ms response times, this solution is easier because it doesn't involve S3. S3 response times tend to be 10-20x faster.)

## Setup

### Prerequisites

An Amazon S3 bucket for which you have [created security credentials](https://console.aws.amazon.com/iam/home?nc2=h_m_sc#users) that have write permissions to the bucket.

### Optional

To make the published JSON publicly accessible, the following must be applied to the S3 bucket:

    - A CORS policy that allows GET requests from whatever origin (domain name) you want to access the data from. The default policy allows access from any origin.
    - A bucket policy that enables public viewing of the published JSON.

See Amazon S3 documentation for how to do this.

### Instructions

1. Create or open an existing Google Sheet.
2. Format the sheet so that the first row contains the column headers you want your JSON objects to have as properties. Example: ![Example](http://i.imgur.com/kTd3noR.png)
3. Install and enable [the add-on](https://chrome.google.com/webstore/detail/s3-json-publisher/mdflfaifaifehmcgmjkbdcdgngoohlld).
4. In the spreadsheet's Add-ons menu, click "Configure..."
5. Fill in the S3 bucket name, path within the bucket (leave blank if none), and AWS credentials that allow write access to the bucket.
6. Click "Submit". The S3 URL of your JSON-ified spreadsheet will be shown.

**Did I miss something in these instructions? Not working as expected? Feel free to [file an issue](https://github.com/viuinsight/google-sheets-to-s3/issues).**

That's it! Any time you make a change to the spreadsheet, the changes will be re-published to the JSON file. The JSON file's filename is taken from the spreadsheet ID, so the spreadsheet can be renamed without breaking the URL.

## Usage notes

- The add-on only looks at the sequentially first sheet tab (called "Sheet1" by default). It won't publish or respond to changes on other tabs.
- The add-on will ignore columns that don't have a value in the header (row 1) of the spreadsheet.
- The add-on will ignore empty rows, skipping over them to the next row with values.
- A blank cell in a row is represented in the JSON as `null`. So if you have a column that could have missing or optional values, be sure to handle the `null` value in your consuming code.

## Development setup instructions

1. Create a new Google Apps Script with files whose names and content matches the ones in this repo (minus README and LICENSE).
2. Add the [Amazon S3 API Binding](https://github.com/viuinsight/google-apps-script-for-aws) as `AWS`.
3. In the menu bar, click Publish > Test as add-on...
4. Select a version, for "Installation Config", choose "Installed and enabled", and select a document (must be a spreadsheet). Save.

**Note:** While testing, the event registration part may not work. If so, you can uncomment the additional menu item _Publish Now_ to trigger the publish manually.
