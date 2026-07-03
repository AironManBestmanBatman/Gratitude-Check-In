/***************************************************
 * GRATITUDE PHOTO MISSION CHECK-IN
 * Google Apps Script Backend
 *
 * Student check-in: select name + upload mission photo.
 * No student PIN. No daily code.
 * Final attendance still requires teacher confirmation.
 ***************************************************/

const APP_TITLE = 'GRATITUDE PHOTO MISSION';
const SECTION_NAME = 'Grade 8 – Gratitude';
const TIMEZONE = 'Asia/Manila';
const OPEN_HOUR = 7;
const OPEN_MINUTE = 30;
const CLOSE_HOUR = 7;
const CLOSE_MINUTE = 45;

const SHEET_NAME = 'Photo Mission Records';
const SETTINGS_SHEET_NAME = 'Mission Settings';
const PHOTO_FOLDER_NAME = 'Gratitude Photo Mission Uploads';

// Change this teacher dashboard PIN before actual deployment.
const TEACHER_PIN = '8450';

const STUDENTS = [
  'Bernardo, Daniel Luis B.',
  'De Los Santos, Lance Aaron R.',
  'Gogolin, Emmanuel P.',
  'Maguad, Rhycel Gabriel G.',
  'Nicolas, Ney Allison M.',
  'Pasatiempo, Carlh Vincent M.',
  'Ramos, Lorenz Andrei C.',
  'Rugay, Re Manuel M.',
  'Santos, Alejandro Domingo S.',
  'Sumbillo, Lucas Matteo C.',
  'Tuazon, Jazell Jhigz Roen H.',
  'Yap, Rohan Kaniel U.',
  'Belarmino, Shanjia Caye T.',
  'Caladiao, Sophia Madison P.',
  'De Vera, Caitlin Jade T.',
  'Estrella, Ma. Diantha Caleigh',
  'Galvez, Jazmine Dior D.C.',
  'Garcia, Fliah Ayana S.',
  'Inoncillo, Samuelle Claude',
  'Luena, Queen Perseus Andrea B.',
  'Reyes, Rhiane Jinri C.',
  'Valles, Rhiyanna Franceska G.',
  "Viñas, Miranda Chryssandre' F."
];

const MISSION_BANK = [
  'Take a photo of your science notebook and pen on your desk. No faces needed.',
  'Take a photo of your chair and bag beside your seat. Avoid classmates’ faces.',
  'Take a photo of your notebook with today’s date written on the page.',
  'Take a photo of one blue object in the classroom beside your notebook.',
  'Take a photo of your hand doing a thumbs-up beside your notebook. No face needed.',
  'Take a photo of your notebook with one classroom wall or board corner visible.',
  'Take a photo of your pencil or pen pointing to your notebook.',
  'Take a photo of your desk area with your learning materials ready.',
  'Take a photo of your notebook and any school-safe object that shows you are ready for class.',
  'Take a photo of your seat area with your notebook open. Avoid taking photos of classmates.'
];

const ALLOWED_MOODS = [
  'Ready',
  'Focused',
  'Happy',
  'Curious',
  'Sleepy but Present'
];

const BADGES = [
  'Mission Scout',
  'Focus Pilot',
  'Gratitude Glow',
  'On-Time Star',
  'Class Navigator',
  'Morning Spark',
  'Notebook Hero',
  'Ready Ranger'
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getInitialData() {
  ensureSheets_();
  const now = new Date();
  return {
    appTitle: APP_TITLE,
    sectionName: SECTION_NAME,
    students: STUDENTS,
    moods: ALLOWED_MOODS,
    openTime: '7:30 AM',
    closeTime: '7:45 AM',
    serverDate: Utilities.formatDate(now, TIMEZONE, 'MMMM d, yyyy'),
    serverTime: Utilities.formatDate(now, TIMEZONE, 'h:mm:ss a'),
    windowState: getWindowState_(now),
    mission: getTodayMission_(),
    privacyReminder: 'Mission photos should show school materials or classroom objects. Avoid capturing classmates’ faces.'
  };
}

function submitMission(payload) {
  ensureSheets_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const name = String(payload && payload.studentName || '').trim();
    const mood = normalizeMood_(payload && payload.mood);
    const photoDataUrl = String(payload && payload.photoDataUrl || '').trim();
    const thumbnailDataUrl = String(payload && payload.thumbnailDataUrl || '').trim();
    const now = new Date();
    const state = getWindowState_(now);

    if (!STUDENTS.includes(name)) {
      return { ok: false, message: 'Please select your correct name from the list.' };
    }

    if (state !== 'open') {
      return {
        ok: false,
        message: state === 'before'
          ? 'Check-in is not yet open. Please wait until 7:30 AM.'
          : 'Check-in is already closed. Please approach your adviser.'
      };
    }

    if (!photoDataUrl || photoDataUrl.indexOf('base64,') === -1) {
      return { ok: false, message: 'Please take or upload your mission photo before submitting.' };
    }

    const dateKey = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const rows = sheet.getDataRange().getValues();
    const alreadySubmitted = rows.some((row, index) => index > 0 && String(row[0]) === dateKey && row[1] === name);

    if (alreadySubmitted) {
      return { ok: false, message: 'Your photo mission is already submitted. Please wait for adviser confirmation.' };
    }

    const mission = getTodayMission_();
    const displayTime = Utilities.formatDate(now, TIMEZONE, 'h:mm:ss a');
    const timestamp = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    const badge = getBadgeFor_(name, dateKey);
    const fileUrl = savePhoto_(photoDataUrl, dateKey, name);

    sheet.appendRow([
      dateKey,
      name,
      'For Confirmation',
      displayTime,
      mission,
      mood,
      badge,
      fileUrl,
      thumbnailDataUrl,
      timestamp,
      '',
      'Photo submitted; adviser confirmation required'
    ]);

    return {
      ok: true,
      message: 'Photo mission submitted! Please wait for adviser confirmation.',
      timeSubmitted: displayTime,
      status: 'For Confirmation',
      mood: mood,
      badge: badge,
      mission: mission
    };
  } finally {
    lock.releaseLock();
  }
}

function getTeacherData(pin) {
  requirePin_(pin);
  ensureSheets_();
  const now = new Date();
  const dateKey = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd');
  const records = getRecordsForDate_(dateKey);
  const recordMap = {};
  records.forEach(record => recordMap[record.studentName] = record);

  let confirmedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  const table = STUDENTS.map(student => {
    const record = recordMap[student];
    if (record) {
      if (record.status === 'Confirmed Present' || record.status === 'Manual Present') confirmedCount++;
      if (record.status === 'For Confirmation') pendingCount++;
      if (record.status === 'Needs Adviser Check') rejectedCount++;
      return {
        studentName: student,
        status: record.status,
        timeSubmitted: record.timeSubmitted,
        mission: record.mission,
        mood: record.mood,
        badge: record.badge,
        photoUrl: record.photoUrl,
        thumbnailDataUrl: record.thumbnailDataUrl,
        confirmedAt: record.confirmedAt,
        remarks: record.remarks || buildRemarks_(record.status)
      };
    }
    return {
      studentName: student,
      status: 'Not Checked In',
      timeSubmitted: '',
      mission: '',
      mood: '',
      badge: '',
      photoUrl: '',
      thumbnailDataUrl: '',
      confirmedAt: '',
      remarks: 'No photo mission submitted'
    };
  });

  const notCheckedCount = STUDENTS.length - records.length;
  const classEnergy = Math.round((confirmedCount / STUDENTS.length) * 100);

  return {
    ok: true,
    appTitle: APP_TITLE,
    sectionName: SECTION_NAME,
    date: Utilities.formatDate(now, TIMEZONE, 'MMMM d, yyyy'),
    serverTime: Utilities.formatDate(now, TIMEZONE, 'h:mm:ss a'),
    openTime: '7:30 AM',
    closeTime: '7:45 AM',
    windowState: getWindowState_(now),
    mission: getTodayMission_(),
    confirmedCount: confirmedCount,
    pendingCount: pendingCount,
    rejectedCount: rejectedCount,
    notCheckedCount: notCheckedCount,
    totalCount: STUDENTS.length,
    classEnergy: classEnergy,
    table: table
  };
}

function confirmStudent(pin, studentName) {
  requirePin_(pin);
  ensureSheets_();
  return updateStudentStatus_(studentName, 'Confirmed Present', 'Adviser confirmed photo mission and physical presence');
}

function flagStudent(pin, studentName) {
  requirePin_(pin);
  ensureSheets_();
  return updateStudentStatus_(studentName, 'Needs Adviser Check', 'Photo/submission needs adviser review');
}

function markManualPresent(pin, studentName) {
  requirePin_(pin);
  ensureSheets_();
  const name = String(studentName || '').trim();
  if (!STUDENTS.includes(name)) return { ok: false, message: 'Student name was not found.' };

  const now = new Date();
  const dateKey = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const confirmedAt = Utilities.formatDate(now, TIMEZONE, 'h:mm:ss a');

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === dateKey && rows[i][1] === name) {
      sheet.getRange(i + 1, 3).setValue('Manual Present');
      sheet.getRange(i + 1, 11).setValue(confirmedAt);
      sheet.getRange(i + 1, 12).setValue('Manually marked present by adviser');
      return { ok: true, message: name + ' was manually marked present.' };
    }
  }

  sheet.appendRow([
    dateKey,
    name,
    'Manual Present',
    confirmedAt,
    getTodayMission_(),
    '',
    'Adviser Verified',
    '',
    '',
    Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
    confirmedAt,
    'Manually marked present by adviser'
  ]);
  return { ok: true, message: name + ' was manually marked present.' };
}

function removeTodayRecord(pin, studentName) {
  requirePin_(pin);
  ensureSheets_();
  const name = String(studentName || '').trim();
  const dateKey = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();

  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === dateKey && rows[i][1] === name) {
      sheet.deleteRow(i + 1);
      return { ok: true, message: name + ' was returned to Not Checked In.' };
    }
  }
  return { ok: false, message: 'No check-in record found for this student today.' };
}

function setTodayMission(pin, missionText) {
  requirePin_(pin);
  ensureSheets_();
  const mission = String(missionText || '').trim();
  if (!mission || mission.length < 10) {
    return { ok: false, message: 'Please enter a clearer mission with at least 10 characters.' };
  }

  const settings = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS_SHEET_NAME);
  const dateKey = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const rows = settings.getDataRange().getValues();
  let updated = false;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === dateKey) {
      settings.getRange(i + 1, 2).setValue(mission);
      updated = true;
      break;
    }
  }

  if (!updated) settings.appendRow([dateKey, mission]);
  return { ok: true, message: 'Today’s photo mission has been updated.', mission: mission };
}

function resetToday(pin) {
  requirePin_(pin);
  ensureSheets_();
  const dateKey = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();

  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === dateKey) sheet.deleteRow(i + 1);
  }
  return { ok: true, message: 'Today’s photo mission records have been reset.' };
}

function updateStudentStatus_(studentName, newStatus, remarks) {
  const name = String(studentName || '').trim();
  if (!STUDENTS.includes(name)) return { ok: false, message: 'Student name was not found.' };

  const dateKey = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const confirmedAt = Utilities.formatDate(new Date(), TIMEZONE, 'h:mm:ss a');

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === dateKey && rows[i][1] === name) {
      sheet.getRange(i + 1, 3).setValue(newStatus);
      sheet.getRange(i + 1, 11).setValue(confirmedAt);
      sheet.getRange(i + 1, 12).setValue(remarks);
      return { ok: true, message: name + ' is now marked as ' + newStatus + '.' };
    }
  }

  return { ok: false, message: 'No photo mission submission found for this student today.' };
}

function ensureSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let records = ss.getSheetByName(SHEET_NAME);
  if (!records) {
    records = ss.insertSheet(SHEET_NAME);
    records.appendRow([
      'Date',
      'Student Name',
      'Status',
      'Time Submitted',
      'Mission',
      'Mood',
      'Badge',
      'Photo File URL',
      'Thumbnail Data URL',
      'Timestamp',
      'Confirmed At',
      'Remarks'
    ]);
    records.setFrozenRows(1);
  }

  let settings = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!settings) {
    settings = ss.insertSheet(SETTINGS_SHEET_NAME);
    settings.appendRow(['Date', 'Custom Mission']);
    settings.setFrozenRows(1);
  }
}

function getRecordsForDate_(dateKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  return rows
    .slice(1)
    .filter(row => String(row[0]) === dateKey)
    .map(row => ({
      date: row[0],
      studentName: row[1],
      status: row[2],
      timeSubmitted: row[3],
      mission: row[4],
      mood: row[5] || '',
      badge: row[6] || '',
      photoUrl: row[7] || '',
      thumbnailDataUrl: row[8] || '',
      timestamp: row[9] || '',
      confirmedAt: row[10] || '',
      remarks: row[11] || ''
    }));
}

function getTodayMission_() {
  const dateKey = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = ss.getSheetByName(SETTINGS_SHEET_NAME);

  if (settings) {
    const rows = settings.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][0]) === dateKey && String(rows[i][1] || '').trim()) {
        return String(rows[i][1]).trim();
      }
    }
  }

  const dayNumber = Number(Utilities.formatDate(new Date(), TIMEZONE, 'D'));
  return MISSION_BANK[(dayNumber - 1) % MISSION_BANK.length];
}

function savePhoto_(dataUrl, dateKey, studentName) {
  const folder = getOrCreatePhotoFolder_();
  const parts = dataUrl.split('base64,');
  const mimeMatch = dataUrl.match(/^data:(.*?);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bytes = Utilities.base64Decode(parts[1]);
  const safeName = studentName.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_');
  const fileName = dateKey + '_' + safeName + '_mission_photo.jpg';
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);
  return file.getUrl();
}

function getOrCreatePhotoFolder_() {
  const folders = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(PHOTO_FOLDER_NAME);
}

function getWindowState_(now) {
  const hour = Number(Utilities.formatDate(now, TIMEZONE, 'H'));
  const minute = Number(Utilities.formatDate(now, TIMEZONE, 'm'));
  const currentMinutes = hour * 60 + minute;
  const openMinutes = OPEN_HOUR * 60 + OPEN_MINUTE;
  const closeMinutes = CLOSE_HOUR * 60 + CLOSE_MINUTE;

  if (currentMinutes < openMinutes) return 'before';
  if (currentMinutes <= closeMinutes) return 'open';
  return 'closed';
}

function requirePin_(pin) {
  if (String(pin || '').trim() !== TEACHER_PIN) {
    throw new Error('Incorrect teacher PIN.');
  }
}

function normalizeMood_(mood) {
  const selectedMood = String(mood || '').trim();
  return ALLOWED_MOODS.includes(selectedMood) ? selectedMood : 'Ready';
}

function getBadgeFor_(name, dateKey) {
  const raw = name + dateKey;
  let sum = 0;
  for (let i = 0; i < raw.length; i++) sum += raw.charCodeAt(i);
  return BADGES[sum % BADGES.length];
}

function buildRemarks_(status) {
  if (status === 'Confirmed Present') return 'Photo and physical presence verified by adviser';
  if (status === 'For Confirmation') return 'Needs adviser confirmation';
  if (status === 'Manual Present') return 'Manually marked by adviser';
  if (status === 'Needs Adviser Check') return 'Submission needs review';
  return 'No photo mission submitted';
}
