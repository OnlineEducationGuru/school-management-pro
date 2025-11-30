// ========== CONFIGURATION ==========
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxMA6T-1wZDzB-rapZkj4RBLTenisbeOtTubDiFDcSexlRX9cyRVSPCy6JV_au3TlwA/exec', // Deploy કર્યા પછી અહીં URL મૂકો
  GRADES: ['બાલવાટિકા', 'ધોરણ - 1', 'ધોરણ - 2', 'ધોરણ - 3', 'ધોરણ - 4',
           'ધોરણ - 5', 'ધોરણ - 6', 'ધોરણ - 7', 'ધોરણ - 8', 'ધોરણ - 9',
           'ધોરણ - 10', 'ધોરણ - 11', 'ધોરણ - 12'],
  SUBJECTS: ['ગુજરાતી', 'અંગ્રેજી', 'હિન્દી', 'સંસ્કૃત', 'ગણિત', 'વિજ્ઞાન', 'સામાજિક વિજ્ઞાન']
};

// ========== STATE ==========
let state = {
  currentUser: null,
  currentScreen: 'splash',
  screenHistory: [],
  currentGrade: null,
  selectedTab: 'sms',
  students: [],
  examMarks: {},
  currentStudentForMarks: null
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.log('SW registration failed', err));
  }
  
  loadSavedTemplates();
  initGradeDropdowns();
  addEventListeners();
  checkLogin();
}

// ========== EVENT LISTENERS ==========
function addEventListeners() {
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', goBack);
  });
  
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const screen = card.dataset.screen;
      if (screen) openScreen(screen);
    });
  });
  
  document.querySelectorAll('.tabs').forEach(tabContainer => {
    tabContainer.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => handleTabClick(tab, tabContainer));
    });
  });
  
  document.getElementById('registerBtn').addEventListener('click', registerUser);
  document.getElementById('district').addEventListener('change', loadTalukas);
  document.getElementById('taluka').addEventListener('change', loadCities);
  
  const studentTabs = document.querySelector('#students-screen .tabs');
  if (studentTabs) {
    studentTabs.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab')) return;
      const tab = e.target.dataset.tab;
      studentTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById('importSection').style.display = tab === 'import' ? 'block' : 'none';
      document.getElementById('removeSection').style.display = tab === 'remove' ? 'block' : 'none';
      if (tab === 'remove') loadStudentsForRemoval();
    });
  }
  
  const settingsTabs = document.querySelector('#settings-screen .tabs');
  if (settingsTabs) {
    settingsTabs.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab')) return;
      const tab = e.target.dataset.tab;
      settingsTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById('languageSection').style.display = tab === 'language' ? 'block' : 'none';
      document.getElementById('messageSection').style.display = tab === 'message' ? 'block' : 'none';
    });
  }
  
  document.getElementById('quickAddBtn').addEventListener('click', quickAddStudent);
  document.getElementById('downloadTemplateBtn').addEventListener('click', downloadTemplate);
  document.getElementById('importBtn').addEventListener('click', importStudents);
  document.getElementById('removeBtn').addEventListener('click', confirmRemoveStudents);
  document.getElementById('removeGrade').addEventListener('change', loadStudentsForRemoval);
  
  document.getElementById('saveLanguageBtn').addEventListener('click', saveLanguage);
  document.getElementById('saveTemplatesBtn').addEventListener('click', saveTemplates);
  document.getElementById('resetTemplatesBtn').addEventListener('click', resetTemplates);
  
  document.getElementById('absentSendBtn').addEventListener('click', sendAbsentMessages);
  document.getElementById('testmarksSendBtn').addEventListener('click', sendTestMarks);
  document.getElementById('homeworkSendBtn').addEventListener('click', sendHomework);
  document.getElementById('othermsgSendBtn').addEventListener('click', sendOtherMessage);
  document.getElementById('finalexamSendBtn').addEventListener('click', sendFinalExamMarks);
  
  document.querySelectorAll('input[name="studentAttendance"]').forEach(radio => {
    radio.addEventListener('change', toggleAttendanceSection);
  });
  document.getElementById('saveMarksBtn').addEventListener('click', saveStudentMarks);
  
  document.getElementById('confirmCancel').addEventListener('click', hideConfirmDialog);
}

// ========== DEVICE ID ==========
function getDeviceId() {
  let deviceId = localStorage.getItem('smp_deviceId');
  if (!deviceId) {
    deviceId = 'DEV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('smp_deviceId', deviceId);
  }
  return deviceId;
}

// ========== API CALLS ==========
async function callGAS(action, data = {}) {
  try {
    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...data })
    });
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, message: error.toString() };
  }
}

// ========== LOGIN / SPLASH ==========
async function checkLogin() {
  const deviceId = getDeviceId();
  
  if (!CONFIG.GAS_URL || CONFIG.GAS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    hideSplash();
    showScreen('registration');
    loadDemoData();
    return;
  }
  
  showLoading();
  const result = await callGAS('checkDeviceLogin', { deviceId });
  hideLoading();
  hideSplash();
  
  if (result.success) {
    state.currentUser = result.user;
    showDashboard();
  } else {
    showScreen('registration');
    loadDistricts();
  }
}

function hideSplash() {
  const splash = document.getElementById('splash-screen');
  if (splash) splash.classList.remove('active');
}

// ========== DEMO DATA ==========
function loadDemoData() {
  const districts = ['અમદાવાદ', 'રાજકોટ', 'સુરત', 'વડોદરા', 'ભાવનગર'];
  const select = document.getElementById('district');
  districts.forEach(d => {
    select.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

// ========== SCREEN NAVIGATION ==========
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(screenId + '-screen');
  if (screen) {
    screen.classList.add('active');
    state.currentScreen = screenId;
  }
}

function openScreen(screenId) {
  state.screenHistory.push(state.currentScreen);
  showScreen(screenId);
  
  switch (screenId) {
    case 'absent':
    case 'testmarks':
    case 'homework':
    case 'othermsg':
    case 'finalexam':
      loadGradeStrip(screenId);
      break;
    case 'students':
      loadGradesForRemoval();
      break;
    case 'helper':
      loadTeacherHelper();
      break;
    case 'contact':
      loadContactInfo();
      break;
    case 'homework':
      loadHomeworkSubjects();
      break;
    case 'testmarks':
      loadSubjects();
      break;
  }
}

function goBack() {
  const prev = state.screenHistory.pop() || 'dashboard';
  showScreen(prev);
}

function showDashboard() {
  if (state.currentUser) {
    document.getElementById('userName').textContent = state.currentUser.teacherName;
    document.getElementById('schoolInfo').textContent =
      state.currentUser.schoolName + ' • DISE: ' + state.currentUser.schoolDISE;
  }
  showScreen('dashboard');
}

// ========== TABS ==========
function handleTabClick(tab, container) {
  container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  state.selectedTab = tab.dataset.tab;
  const screenId = container.closest('.screen').id.replace('-screen', '');
  if (screenId === 'absent') renderStudentList('absent');
}

// ========== REGISTRATION ==========
async function registerUser() {
  const mobile = document.getElementById('mobile').value.trim();
  const email = document.getElementById('email').value.trim();
  const dise = document.getElementById('schoolDISE').value.trim();
  
  if (mobile.length !== 10) {
    showToast('મોબાઈલ નંબર 10 અંકનો હોવો જોઈએ');
    return;
  }
  if (dise.length !== 11) {
    showToast('DISE Code 11 અંકનો હોવો જોઈએ');
    return;
  }
  if (!email.endsWith('@gmail.com')) {
    showToast('માત્ર Gmail સ્વીકાર્ય છે');
    return;
  }
  
  const data = {
    teacherName: document.getElementById('teacherName').value.trim(),
    mobile,
    email,
    schoolDISE: dise,
    schoolName: document.getElementById('schoolName').value.trim(),
    district: document.getElementById('district').value,
    taluka: document.getElementById('taluka').value,
    city: document.getElementById('city').value,
    deviceId: getDeviceId()
  };
  
  for (let k in data) {
    if (!data[k]) {
      showToast('બધી માહિતી ભરો');
      return;
    }
  }
  
  if (!CONFIG.GAS_URL || CONFIG.GAS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    state.currentUser = { ...data, schoolSheetId: 'DEMO_SHEET_ID' };
    showToast('Demo mode: Registration local છે');
    showDashboard();
    return;
  }
  
  showLoading();
  const result = await callGAS('registerUser', data);
  hideLoading();
  
  if (result.success) {
    showToast(result.message || 'રજિસ્ટ્રેશન સફળ!');
    state.currentUser = {
      ...data,
      schoolSheetId: result.schoolSheetId
    };
    showDashboard();
  } else {
    showToast(result.message || 'Error occurred');
  }
}

// ========== LOCATION ==========
async function loadDistricts() {
  if (!CONFIG.GAS_URL || CONFIG.GAS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    loadDemoData();
    return;
  }
  const result = await callGAS('getDistricts');
  if (result.success && result.data) {
    const select = document.getElementById('district');
    result.data.forEach(d => {
      select.innerHTML += `<option value="${d}">${d}</option>`;
    });
  }
}

async function loadTalukas() {
  const district = document.getElementById('district').value;
  const talukaSelect = document.getElementById('taluka');
  talukaSelect.innerHTML = '<option value="">તાલુકો પસંદ કરો</option>';
  document.getElementById('city').innerHTML = '<option value="">ગામ/શહેર પસંદ કરો</option>';
  
  if (!district) return;
  
  if (!CONFIG.GAS_URL || CONFIG.GAS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    ['તાલુકો 1', 'તાલુકો 2', 'તાલુકો 3'].forEach(t => {
      talukaSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });
    return;
  }
  
  const result = await callGAS('getTalukas', { district });
  if (result.success && result.data) {
    result.data.forEach(t => {
      talukaSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });
  }
}

async function loadCities() {
  const taluka = document.getElementById('taluka').value;
  const citySelect = document.getElementById('city');
  citySelect.innerHTML = '<option value="">ગામ/શહેર પસંદ કરો</option>';
  
  if (!taluka) return;
  
  if (!CONFIG.GAS_URL || CONFIG.GAS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    ['ગામ 1', 'ગામ 2', 'ગામ 3'].forEach(c => {
      citySelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
    return;
  }
  
  const result = await callGAS('getCities', { taluka });
  if (result.success && result.data) {
    result.data.forEach(c => {
      citySelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
  }
}

// ========== GRADES & STUDENTS (DEMO) ==========
function loadGradeStrip(screenId) {
  const strip = document.getElementById(screenId + 'GradeStrip');
  if (!strip) return;
  
  const grades = ['ધોરણ - 1', 'ધોરણ - 2', 'ધોરણ - 3'];
  strip.innerHTML = '';
  
  grades.forEach((grade, index) => {
    const btn = document.createElement('button');
    btn.className = 'grade-btn' + (index === 0 ? ' active' : '');
    btn.textContent = grade;
    btn.addEventListener('click', () => {
      strip.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentGrade = grade;
      loadStudentsForScreen(screenId, grade);
    });
    strip.appendChild(btn);
  });
  
  if (grades.length > 0) {
    state.currentGrade = grades[0];
    loadStudentsForScreen(screenId, grades[0]);
  }
}

function loadStudentsForScreen(screenId, grade) {
  state.students = [
    { id: '1', name: 'પટેલ હરेश', mobile: '9876543210', attendance: 'present' },
    { id: '2', name: 'શાહ મહેશ', mobile: '9876543211', attendance: 'present' },
    { id: '3', name: 'દવે રાજેશ', mobile: '9876543212', attendance: 'present' }
  ];
  renderStudentList(screenId);
  if (screenId === 'homework') loadHomeworkSubjects();
}

function renderStudentList(screenId) {
  const list = document.getElementById(screenId + 'StudentList');
  if (!list) return;
  list.innerHTML = '';
  
  state.students.forEach((student, index) => {
    const item = document.createElement('div');
    item.className = 'student-item';
    
    if (screenId === 'absent') {
      if (state.selectedTab === 'call') {
        item.innerHTML = `
          <div class="student-info">
            <h4>${student.name}</h4>
            <span>${student.mobile}</span>
          </div>
          <button class="call-btn" onclick="makeCall('${student.mobile}')">
            <span class="material-icons">call</span>
          </button>
        `;
      } else {
        item.innerHTML = `
          <div class="student-info">
            <h4>${student.name}</h4>
            <span>${student.mobile}</span>
          </div>
          <div class="attendance-btns">
            <button class="att-btn present ${student.attendance === 'present' ? 'active' : ''}" 
                    onclick="setAttendance(${index}, 'present')">હા</button>
            <button class="att-btn absent ${student.attendance === 'absent' ? 'active' : ''}" 
                    onclick="setAttendance(${index}, 'absent')">ગે</button>
          </div>
        `;
      }
    } else if (screenId === 'testmarks') {
      item.innerHTML = `
        <div class="student-info">
          <h4>${student.name}</h4>
          <span>${student.mobile}</span>
        </div>
        <div class="attendance-btns">
          <button class="att-btn present ${student.attendance === 'present' ? 'active' : ''}" 
                  onclick="setAttendance(${index}, 'present')">P</button>
          <button class="att-btn absent ${student.attendance === 'absent' ? 'active' : ''}" 
                  onclick="setAttendance(${index}, 'absent')">A</button>
          <input type="number" class="marks-input" data-index="${index}" placeholder="માર્ક્સ">
        </div>
      `;
    } else if (screenId === 'finalexam') {
      const saved = state.examMarks[student.id] ? true : false;
      item.className = 'student-item' + (saved ? ' saved' : '');
      item.innerHTML = `
        <div class="student-info">
          <h4>${student.name}</h4>
          <span>${student.mobile}</span>
        </div>
        ${saved ? `<button class="btn-outline" onclick="editStudentMarks('${student.id}')"><span class="material-icons">edit</span></button>` : ''}
      `;
      item.addEventListener('click', (e) => {
        if (!e.target.closest('button')) openStudentEntry(student);
      });
    }
    
    list.appendChild(item);
  });
  
  const sendBtn = document.getElementById(screenId + 'SendBtn');
  if (sendBtn && screenId === 'absent') {
    sendBtn.style.display = state.selectedTab === 'call' ? 'none' : 'flex';
  }
}

function setAttendance(index, status) {
  state.students[index].attendance = status;
  renderStudentList(state.currentScreen);
}

// ========== MESSAGING ==========
function sendAbsentMessages() {
  const absentStudents = state.students.filter(s => s.attendance === 'absent');
  if (absentStudents.length === 0) {
    showToast('ગેરહાજર વિદ્યાર્થી પસંદ કરો');
    return;
  }
  
  const template = localStorage.getItem('smp_absentTemplate') || 
    'આજે તારીખ ({date}) {name} શાળામાં ગેરહાજર હતા. તો આપનું બાળક રોજ શાળામાં હાજર રહે તેવી નમ્ર વિનંતી, (શ્રી {school}).';
  const date = new Date().toLocaleDateString('gu-IN');
  const schoolName = state.currentUser?.schoolName || 'આપની શાળા';
  
  absentStudents.forEach((student, index) => {
    setTimeout(() => {
      const message = template
        .replace('{date}', date)
        .replace('{name}', student.name)
        .replace('{school}', schoolName);
      if (state.selectedTab === 'sms') {
        window.open(`sms:${student.mobile}?body=${encodeURIComponent(message)}`);
      } else {
        window.open(`https://wa.me/91${student.mobile}?text=${encodeURIComponent(message)}`);
      }
    }, index * 1000);
  });
  
  showToast(`${absentStudents.length} મેસેજ મોકલાઈ રહ્યા છે...`);
}

function makeCall(mobile) {
  window.open(`tel:${mobile}`);
}

function sendTestMarks() {
  const subject = document.getElementById('testSubject').value;
  const date = document.getElementById('testDate').value;
  const total = document.getElementById('totalMarks').value;
  
  if (!subject || !date || !total) {
    showToast('બધી માહિતી ભરો');
    return;
  }
  
  const marksTemplate = localStorage.getItem('smp_marksTemplate') || 
    'આજે તારીખ({date}) {subject} ની ટેસ્ટમાં {name} ના માર્ક્સ: {marks}/{total}, (શ્રી {school}).';
  const absentTemplate = localStorage.getItem('smp_testAbsentTemplate') || 
    'આજે તારીખ({date}) {subject} ની ટેસ્ટમાં {name} ગેરહાજર હતા, (શ્રી {school}).';
  const formattedDate = new Date(date).toLocaleDateString('gu-IN');
  const schoolName = state.currentUser?.schoolName || 'આપની શાળા';
  
  state.students.forEach((student, index) => {
    setTimeout(() => {
      const marksInput = document.querySelector(`.marks-input[data-index="${index}"]`);
      const marks = marksInput ? marksInput.value : '';
      let message;
      if (student.attendance === 'absent') {
        message = absentTemplate
          .replace('{date}', formattedDate)
          .replace('{subject}', subject)
          .replace('{name}', student.name)
          .replace('{school}', schoolName);
      } else {
        message = marksTemplate
          .replace('{date}', formattedDate)
          .replace('{subject}', subject)
          .replace('{name}', student.name)
          .replace('{marks}', marks)
          .replace('{total}', total)
          .replace('{school}', schoolName);
      }
      if (state.selectedTab === 'sms') {
        window.open(`sms:${student.mobile}?body=${encodeURIComponent(message)}`);
      } else {
        window.open(`https://wa.me/91${student.mobile}?text=${encodeURIComponent(message)}`);
      }
    }, index * 1000);
  });
  
  showToast('માર્ક્સ મોકલાઈ રહ્યા છે...');
}

// ========== HOMEWORK ==========
function loadHomeworkSubjects() {
  const container = document.getElementById('homeworkSubjects');
  if (!container) return;
  const subjects = [...CONFIG.SUBJECTS, 'અન્ય'];
  container.innerHTML = '';
  
  subjects.forEach(subject => {
    const item = document.createElement('div');
    item.className = 'subject-item';
    item.innerHTML = `
      <input type="checkbox" class="subject-checkbox" data-subject="${subject}">
      <span class="subject-name">${subject}</span>
      <input type="text" class="subject-input" data-subject="${subject}" placeholder="હોમવર્ક લખો">
      ${subject === 'અન્ય' ? '<input type="text" class="subject-input other-name" placeholder="વિષયનું નામ">' : ''}
    `;
    const checkbox = item.querySelector('.subject-checkbox');
    const input = item.querySelector('.subject-input');
    checkbox.addEventListener('change', () => {
      input.classList.toggle('show', checkbox.checked);
      if (subject === 'અન્ય') {
        item.querySelector('.other-name').classList.toggle('show', checkbox.checked);
      }
    });
    container.appendChild(item);
  });
}

function sendHomework() {
  const homeworkData = [];
  document.querySelectorAll('.subject-checkbox:checked').forEach(cb => {
    const subject = cb.dataset.subject;
    const hwInput = document.querySelector(`.subject-input[data-subject="${subject}"]`);
    const homework = hwInput ? hwInput.value : '';
    if (homework) homeworkData.push(`${subject}: ${homework}`);
  });
  
  if (homeworkData.length === 0) {
    showToast('હોમવર્ક ભરો');
    return;
  }
  
  const template = localStorage.getItem('smp_homeworkTemplate') || 
    'આજે તારીખ ({date}) ના રોજ આજનું હોમવર્ક: {subjects}, (શ્રી {school}).';
  const date = new Date().toLocaleDateString('gu-IN');
  const schoolName = state.currentUser?.schoolName || 'આપની શાળા';
  const message = template
    .replace('{date}', date)
    .replace('{subjects}', homeworkData.join(', '))
    .replace('{school}', schoolName);
  
  state.students.forEach((student, index) => {
    setTimeout(() => {
      if (state.selectedTab === 'sms') {
        window.open(`sms:${student.mobile}?body=${encodeURIComponent(message)}`);
      } else {
        window.open(`https://wa.me/91${student.mobile}?text=${encodeURIComponent(message)}`);
      }
    }, index * 1000);
  });
  
  showToast('હોમવર્ક મોકલાઈ રહ્યું છે...');
}

// ========== OTHER MESSAGE ==========
function sendOtherMessage() {
  const message = document.getElementById('customMessage').value;
  if (!message) {
    showToast('મેસેજ લખો');
    return;
  }
  state.students.forEach((student, index) => {
    setTimeout(() => {
      if (state.selectedTab === 'sms') {
        window.open(`sms:${student.mobile}?body=${encodeURIComponent(message)}`);
      } else {
        window.open(`https://wa.me/91${student.mobile}?text=${encodeURIComponent(message)}`);
      }
    }, index * 1000);
  });
  showToast('મેસેજ મોકલાઈ રહ્યા છે...');
}

// ========== FINAL EXAM ==========
function openStudentEntry(student) {
  state.screenHistory.push('finalexam');
  showScreen('studententry');
  document.getElementById('studentEntryName').textContent = student.name;
  state.currentStudentForMarks = student;
  
  const container = document.getElementById('subjectMarksInputs');
  container.innerHTML = '';
  CONFIG.SUBJECTS.forEach(subject => {
    const savedMarks = state.examMarks[student.id]?.[subject] || '';
    container.innerHTML += `
      <div class="subject-marks-row">
        <label>${subject}</label>
        <input type="number" data-subject="${subject}" value="${savedMarks}" placeholder="માર્ક્સ">
      </div>
    `;
  });
  container.innerHTML += `
    <div class="subject-marks-row">
      <label><input type="checkbox" id="otherSubjectCheck"> અન્ય</label>
    </div>
    <div id="otherSubjectFields" style="display:none;">
      <div class="subject-marks-row">
        <input type="text" id="otherSubjectNameExam" placeholder="વિષયનું નામ" style="flex:1;">
      </div>
      <div class="subject-marks-row">
        <label>માર્ક્સ</label>
        <input type="number" id="otherSubjectMarks" placeholder="માર્ક્સ">
      </div>
    </div>
  `;
  document.getElementById('otherSubjectCheck').addEventListener('change', (e) => {
    document.getElementById('otherSubjectFields').style.display = e.target.checked ? 'block' : 'none';
  });
}

function toggleAttendanceSection() {
  const present = document.querySelector('input[name="studentAttendance"]:checked').value === 'present';
  document.getElementById('marksEntrySection').style.display = present ? 'block' : 'none';
}

function saveStudentMarks() {
  const student = state.currentStudentForMarks;
  if (!student) return;
  const attendance = document.querySelector('input[name="studentAttendance"]:checked').value;
  
  if (attendance === 'absent') {
    state.examMarks[student.id] = { absent: true };
  } else {
    const marks = {};
    document.querySelectorAll('#subjectMarksInputs input[data-subject]').forEach(input => {
      if (input.value) marks[input.dataset.subject] = input.value;
    });
    marks.total = document.getElementById('examTotalMarks').value;
    const otherName = document.getElementById('otherSubjectNameExam').value;
    const otherMarks = document.getElementById('otherSubjectMarks').value;
    if (otherName && otherMarks) marks[otherName] = otherMarks;
    state.examMarks[student.id] = marks;
  }
  
  localStorage.setItem('smp_examMarks_' + state.currentGrade, JSON.stringify(state.examMarks));
  showToast('માર્ક્સ સેવ થયા!');
  goBack();
  setTimeout(() => renderStudentList('finalexam'), 100);
}

function sendFinalExamMarks() {
  const savedCount = Object.keys(state.examMarks).length;
  const status = document.getElementById('examStatus');
  if (savedCount < state.students.length) {
    status.textContent = `${savedCount}/${state.students.length} વિદ્યાર્થીઓના માર્ક્સ સેવ થયા. બાકીના પણ સેવ કરો.`;
    showToast('પહેલા બધા વિદ્યાર્થીઓના માર્ક્સ સેવ કરો');
    return;
  }
  
  const template = localStorage.getItem('smp_finalExamTemplate') || 
    'વિદ્યાર્થી: {name} નું પ્રથમ સત્રાંત પરીક્ષાનું પરિણામ: {marks}, (શ્રી {school}).';
  const absentTemplate = localStorage.getItem('smp_finalAbsentTemplate') || 
    'વિદ્યાર્થી: {name} પ્રથમ સત્રાંત પરીક્ષામાં ગેરહાજર હતા, (શ્રી {school}).';
  const schoolName = state.currentUser?.schoolName || 'આપની શાળા';
  
  state.students.forEach((student, index) => {
    setTimeout(() => {
      const marks = state.examMarks[student.id];
      let message;
      if (marks?.absent) {
        message = absentTemplate
          .replace('{name}', student.name)
          .replace('{school}', schoolName);
      } else {
        const marksStr = Object.entries(marks || {})
          .filter(([key]) => key !== 'total' && key !== 'absent')
          .map(([subject, mark]) => `${subject}: ${mark}/${marks.total || '100'}`)
          .join(', ');
        message = template
          .replace('{name}', student.name)
          .replace('{marks}', marksStr)
          .replace('{school}', schoolName);
      }
      if (state.selectedTab === 'sms') {
        window.open(`sms:${student.mobile}?body=${encodeURIComponent(message)}`);
      } else {
        window.open(`https://wa.me/91${student.mobile}?text=${encodeURIComponent(message)}`);
      }
    }, index * 1000);
  });
  
  showToast('પરિણામ મોકલાઈ રહ્યું છે...');
}

// ========== STUDENT MANAGEMENT ==========
function initGradeDropdowns() {
  const gradeOptions = CONFIG.GRADES.map(g => `<option value="${g}">${g}</option>`).join('');
  ['quickStudentGrade', 'importGrade', 'removeGrade'].forEach(id => {
    const select = document.getElementById(id);
    if (select) select.innerHTML = `<option value="">ધોરણ પસંદ કરો</option>${gradeOptions}`;
  });
}

function quickAddStudent() {
  const name = document.getElementById('quickStudentName').value;
  const mobile = document.getElementById('quickStudentMobile').value;
  const grade = document.getElementById('quickStudentGrade').value;
  if (!name || !mobile || !grade) {
    showToast('બધી માહિતી ભરો');
    return;
  }
  if (mobile.length !== 10) {
    showToast('મોબાઈલ નંબર 10 અંકનો હોવો જોઈએ');
    return;
  }
  showToast('વિદ્યાર્થી ઉમેરાયો! (Demo)');
  document.getElementById('quickStudentName').value = '';
  document.getElementById('quickStudentMobile').value = '';
}

function downloadTemplate() {
  const csvContent = "Name,Mobile\nપટેલ હરેશ,9876543210\nશાહ મહેશ,9876543211";
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'student_template.csv';
  link.click();
  showToast('Template downloaded!');
}

function importStudents() {
  const file = document.getElementById('studentFile').files[0];
  const grade = document.getElementById('importGrade').value;
  if (!file || !grade) {
    showToast('ફાઈલ અને ધોરણ પસંદ કરો');
    return;
  }
  showToast('વિદ્યાર્થીઓ આયાત થયા! (Demo)');
}

function loadGradesForRemoval() {
  // dropdown પહેલેથી initGradeDropdowns માં ભરાઈ જાય છે
}

function loadStudentsForRemoval() {
  const grade = document.getElementById('removeGrade').value;
  if (!grade) return;
  const list = document.getElementById('removeStudentList');
  list.innerHTML = '';
  const students = [
    { id: '1', name: 'પટેલ હરેશ', mobile: '9876543210' },
    { id: '2', name: 'શાહ મહેશ', mobile: '9876543211' }
  ];
  students.forEach(student => {
    list.innerHTML += `
      <div class="student-item">
        <input type="checkbox" class="student-checkbox" value="${student.id}">
        <div class="student-info">
          <h4>${student.name}</h4>
          <span>${student.mobile}</span>
        </div>
      </div>
    `;
  });
}

function confirmRemoveStudents() {
  const checkboxes = document.querySelectorAll('#removeStudentList .student-checkbox:checked');
  if (checkboxes.length === 0) {
    showToast('વિદ્યાર્થીઓ પસંદ કરો');
    return;
  }
  showConfirmDialog(
    'શું ખરેખર આ વિદ્યાર્થીઓને ડિલીટ કરવા માંગો છો? એકવાર ડિલીટ થયા પછી પાછા લાવી શકાશે નહીં.',
    () => {
      showToast('વિદ્યાર્થીઓ દૂર થયા! (Demo)');
      loadStudentsForRemoval();
    }
  );
}

// ========== SETTINGS ==========
function loadSavedTemplates() {
  const templates = {
    absentTemplate: 'આજે તારીખ ({date}) {name} શાળામાં ગેરહાજર હતા. તો આપનું બાળક રોજ શાળામાં હાજર રહે તેવી નમ્ર વિનંતી, (શ્રી {school}).',
    marksTemplate: 'આજે તારીખ({date}) {subject} ની ટેસ્ટમાં {name} ના માર્ક્સ: {marks}/{total}, (શ્રી {school}).',
    testAbsentTemplate: 'આજે તારીખ({date}) {subject} ની ટેસ્ટમાં {name} ગેરહાજર હતા, (શ્રી {school}).',
    homeworkTemplate: 'આજે તારીખ ({date}) ના રોજ આજનું હોમવર્ક: {subjects}, (શ્રી {school}).',
    finalExamTemplate: 'વિદ્યાર્થી: {name} નું પ્રથમ સત્રાંત પરીક્ષાનું પરિણામ: {marks}, (શ્રી {school}).',
    finalAbsentTemplate: 'વિદ્યાર્થી: {name} પ્રથમ સત્રાંત પરીક્ષામાં ગેરહાજર હતા, (શ્રી {school}).'
  };
  Object.keys(templates).forEach(key => {
    const saved = localStorage.getItem('smp_' + key);
    const textarea = document.getElementById(key);
    if (textarea) textarea.value = saved || templates[key];
  });
}

function saveLanguage() {
  const language = document.querySelector('input[name="language"]:checked').value;
  localStorage.setItem('smp_language', language);
  showToast('ભાષા સેવ થઈ!');
}

function saveTemplates() {
  const templateIds = ['absentTemplate', 'marksTemplate', 'testAbsentTemplate', 
                       'homeworkTemplate', 'finalExamTemplate', 'finalAbsentTemplate'];
  templateIds.forEach(id => {
    const textarea = document.getElementById(id);
    if (textarea) localStorage.setItem('smp_' + id, textarea.value);
  });
  showToast('Templates સેવ થયા!');
}

function resetTemplates() {
  const templateIds = ['absentTemplate', 'marksTemplate', 'testAbsentTemplate', 
                       'homeworkTemplate', 'finalExamTemplate', 'finalAbsentTemplate'];
  templateIds.forEach(id => localStorage.removeItem('smp_' + id));
  loadSavedTemplates();
  showToast('Templates રીસેટ થયા!');
}

// ========== SUBJECTS / HELPER / CONTACT ==========
function loadSubjects() {
  const select = document.getElementById('testSubject');
  if (!select) return;
  select.innerHTML = '<option value="">વિષય પસંદ કરો</option>';
  CONFIG.SUBJECTS.forEach(s => {
    select.innerHTML += `<option value="${s}">${s}</option>`;
  });
}

function loadTeacherHelper() {
  const list = document.getElementById('helperList');
  list.innerHTML = '';
  const helpers = [
    { title: 'SAS Gujarat', link: 'https://sas.gujarat.gov.in' },
    { title: 'SSA Gujarat', link: 'https://ssagujarat.org' },
    { title: 'GCERT', link: 'https://gcert.gujarat.gov.in' },
    { title: 'Diksha App', link: 'https://diksha.gov.in' }
  ];
  helpers.forEach(item => {
    list.innerHTML += `
      <a class="helper-item" href="${item.link}" target="_blank">
        <span>${item.title}</span>
        <span class="material-icons">open_in_new</span>
      </a>
    `;
  });
}

function loadContactInfo() {
  document.getElementById('emailSupport').href = 'mailto:support@example.com';
  document.getElementById('whatsappSupport').href = 'https://wa.me/919876543210';
  const socialLinks = document.getElementById('socialLinks');
  socialLinks.innerHTML = `
    <a href="https://facebook.com" target="_blank"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" alt="Facebook"></a>
    <a href="https://instagram.com" target="_blank"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" alt="Instagram"></a>
    <a href="https://youtube.com" target="_blank"><img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" alt="YouTube"></a>
  `;
}

// ========== UI UTILITIES ==========
function showLoading() {
  document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('show');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function showConfirmDialog(message, onConfirm) {
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmDialog').classList.add('show');
  document.getElementById('confirmOk').onclick = () => {
    hideConfirmDialog();
    onConfirm();
  };
}

function hideConfirmDialog() {
  document.getElementById('confirmDialog').classList.remove('show');
}
