GRATITUDE PHOTO MISSION CHECK-IN

A fun morning attendance/check-in website for Grade 8 – Gratitude.
Students complete a quick photo mission from 7:30 AM to 7:45 AM.
Their submission is NOT automatically final. The teacher/adviser confirms it in the dashboard.

WHAT CHANGED IN THIS VERSION
- No student PIN.
- No daily code.
- Students submit a mission photo instead.
- Final status is still controlled by the teacher.
- The dashboard shows photo thumbnails for fast checking.
- Teacher can confirm, review, undo, or manually mark present.

STUDENT FLOW
1. Open the website using the QR code.
2. Select name.
3. Choose morning vibe.
4. Read the Mission of the Day.
5. Take or upload one mission photo.
6. Submit before 7:45 AM.
7. Status becomes: For Confirmation.

TEACHER FLOW
1. Open the Teacher Control Room.
2. Enter the teacher PIN.
3. Review the photo thumbnails and the actual students in the room.
4. Click Confirm for students who are physically present.
5. Use Review if the photo/submission is suspicious.
6. Use Manual Present if a student is present but failed to submit.

CHECK-IN WINDOW
Open: 7:30 AM
Close: 7:45 AM
Timezone: Asia/Manila

DEFAULT TEACHER PIN
8450

IMPORTANT: Change TEACHER_PIN in Code.gs before actual use.

PRIVACY-SAFE PHOTO MISSION DESIGN
The default missions avoid requiring student faces.
Recommended rule: Mission photos should show notebooks, desks, classroom objects, or learning materials.
Avoid photos of classmates' faces, private messages, grades, IDs, or personal details.

DEFAULT MISSION BANK
1. Take a photo of your science notebook and pen on your desk. No faces needed.
2. Take a photo of your chair and bag beside your seat. Avoid classmates' faces.
3. Take a photo of your notebook with today's date written on the page.
4. Take a photo of one blue object in the classroom beside your notebook.
5. Take a photo of your hand doing a thumbs-up beside your notebook. No face needed.
6. Take a photo of your notebook with one classroom wall or board corner visible.
7. Take a photo of your pencil or pen pointing to your notebook.
8. Take a photo of your desk area with your learning materials ready.
9. Take a photo of your notebook and any school-safe object that shows you are ready for class.
10. Take a photo of your seat area with your notebook open. Avoid taking photos of classmates.

FILES INCLUDED
- Code.gs: Google Apps Script backend.
- Index.html: Main web app interface for Apps Script.
- preview.html: Local browser preview/demo. It uses localStorage and can be tested anytime.

HOW TO INSTALL IN GOOGLE APPS SCRIPT
1. Create a new Google Sheet.
2. Go to Extensions > Apps Script.
3. Replace the default Code.gs content with the included Code.gs file.
4. Create a new HTML file named Index.
5. Paste the included Index.html content into that file.
6. In Apps Script settings, set timezone to Asia/Manila.
7. Click Deploy > New deployment.
8. Select type: Web app.
9. Execute as: Me.
10. Who has access: Anyone with the link.
11. Click Deploy.
12. Copy the Web App URL and generate a QR code for students.

GOOGLE SHEETS OUTPUT
The app creates a sheet named: Photo Mission Records
Columns include:
- Date
- Student Name
- Status
- Time Submitted
- Mission
- Mood
- Badge
- Photo File URL
- Thumbnail Data URL
- Timestamp
- Confirmed At
- Remarks

PHOTO STORAGE
Full mission photos are saved in Google Drive folder:
Gratitude Photo Mission Uploads

Thumbnails are stored in the Google Sheet so the dashboard can show quick previews.

SUGGESTED CLASSROOM RULES
1. Submit only your own attendance.
2. Use only one photo.
3. Do not include classmates' faces unless the teacher allowed it.
4. Do not take photos of private information.
5. Submission alone is not final attendance; the adviser confirms it.
6. Students who cannot submit should approach the adviser before 7:45 AM.

EDITING STUDENT LIST
Open Code.gs and edit the STUDENTS array.

EDITING TIME WINDOW
Open Code.gs and edit:
OPEN_HOUR = 7
OPEN_MINUTE = 30
CLOSE_HOUR = 7
CLOSE_MINUTE = 45

EDITING MISSIONS
Open Code.gs and edit the MISSION_BANK array.
The teacher can also set a custom mission for the day inside the Teacher Control Room.
