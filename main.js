import { initApp } from './src/JS/app.js';

// ═══════════════════════════════════════════
// 🌍 تفعيل قائمة الكواكب المخصصة
// ═══════════════════════════════════════════
function initPlanetSelect() {
  const wrapper = document.getElementById('planet-select-wrapper');
  const trigger = document.getElementById('planet-select-trigger');
  const optionsContainer = document.getElementById('planet-options');
  const originalSelect = document.getElementById('planet-select');

  if (!wrapper || !trigger || !optionsContainer || !originalSelect) return;

  // بيانات الكواكب
  const planetData = {
    earth:   { icon: '🌍', name: 'الأرض',   value: '9.81 m/s²' },
    moon:    { icon: '🌙', name: 'القمر',   value: '1.62 m/s²' },
    mars:    { icon: '🔴', name: 'المريخ',  value: '3.71 m/s²' },
    jupiter: { icon: '🟠', name: 'المشتري', value: '24.79 m/s²' },
    mercury: { icon: '☿️', name: 'عطارد',  value: '3.70 m/s²' },
    venus:   { icon: '✨', name: 'الزهرة',  value: '8.87 m/s²' },
    saturn:  { icon: '🪐', name: 'زحل',    value: '10.44 m/s²' },
    uranus:  { icon: '🔵', name: 'أورانوس', value: '8.69 m/s²' },
    neptune: { icon: '🔷', name: 'نبتون',  value: '11.15 m/s²' },
    custom:  { icon: '⚙️', name: 'مخصص',   value: 'تعيين يدوي' }
  };

  // فتح/إغلاق القائمة
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = optionsContainer.classList.contains('open');
    
    // إغلاق أي قوائم مفتوحة أخرى
    document.querySelectorAll('.planet-options').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.planet-select-trigger').forEach(el => el.classList.remove('active'));
    
    if (!isOpen) {
      optionsContainer.classList.add('open');
      trigger.classList.add('active');
    }
  });

  // اختيار كوكب
  optionsContainer.querySelectorAll('.planet-option').forEach(option => {
    option.addEventListener('click', () => {
      const key = option.dataset.value;
      const planet = planetData[key];
      if (!planet) return;

      // تحديث القائمة الأصلية (تعمل خلفياً)
      originalSelect.value = key;
      originalSelect.dispatchEvent(new Event('change'));

      // تحديث الزر
      trigger.querySelector('.planet-icon').textContent = planet.icon;
      trigger.querySelector('.planet-name').textContent = planet.name;
      trigger.querySelector('.planet-value').textContent = planet.value;

      // تحديث حالة التحديد
      optionsContainer.querySelectorAll('.planet-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === key);
      });

      // إغلاق القائمة
      optionsContainer.classList.remove('open');
      trigger.classList.remove('active');
    });
  });

  // إغلاق عند النقر خارج القائمة
  document.addEventListener('click', () => {
    optionsContainer.classList.remove('open');
    trigger.classList.remove('active');
  });

  wrapper.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // تحديث أولي
  const initialKey = originalSelect.value || 'earth';
  const initialPlanet = planetData[initialKey];
  if (initialPlanet) {
    trigger.querySelector('.planet-icon').textContent = initialPlanet.icon;
    trigger.querySelector('.planet-name').textContent = initialPlanet.name;
    trigger.querySelector('.planet-value').textContent = initialPlanet.value;
  }
}

// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initApp(); 
  initPlanetSelect(); // ← تفعيل القائمة أولاً
    initMaterialSelect();
              // ← ثم تشغيل التطبيق
});


   // ═══════════════════════════════════════════
// 🔩 تفعيل قائمة المواد المخصصة (مع صور)
// ═══════════════════════════════════════════
function initMaterialSelect() {
  const wrapper = document.getElementById('material-select-wrapper');
  const trigger = document.getElementById('material-select-trigger');
  const optionsContainer = document.getElementById('material-options');
  const originalSelect = document.getElementById('materialSelect');

  if (!wrapper || !trigger || !optionsContainer || !originalSelect) return;

  // بيانات المواد مع روابط الصور
  const materialData = {
    '0.98': { 
      img: 'src/assets/materials/Steel.png', 
      name: 'فولاذ',   
      value: 'ارتداد: 0.98', 
      color: '#78909C' 
    },
    '0.92': { 
      img: 'src/assets/materials/Glass.png', 
      name: 'زجاج',    
      value: 'ارتداد: 0.92', 
      color: '#4FC3F7' 
    },
    '0.80': { 
      img: 'src/assets/materials/Rubber.png', 
      name: 'مطاط',    
      value: 'ارتداد: 0.80', 
      color: '#333333' 
    },
    '0.50': { 
      img: 'src/assets/materials/Wood.png', 
      name: 'خشب',     
      value: 'ارتداد: 0.50', 
      color: '#8D6E63' 
    },
    'custom': { 
      img: 'newtons-cradle/src/assets/materials/settings-icon-png.png', 
      name: 'مخصص',   
      value: 'تعيين يدوي',   
      color: '#E94560' 
    }
    
  };

  // ✅ دالة مساعدة: تحديث الزر الرئيسي
 function updateTrigger(material) {
  const img = trigger.querySelector('.material-img');
  const name = trigger.querySelector('.material-name');
  const value = trigger.querySelector('.material-value');

  if (!img || !name || !value) return;

  // تحديث مباشر بدون إنشاء عناصر جديدة
  img.src = material.img;
  img.alt = material.name;

  name.textContent = material.name;
  value.textContent = material.value;
}

  // فتح/إغلاق القائمة
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = optionsContainer.classList.contains('open');
    
    document.querySelectorAll('.planet-options, .material-options').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.planet-select-trigger, .material-select-trigger').forEach(el => el.classList.remove('active'));
    
    if (!isOpen) {
      optionsContainer.classList.add('open');
      trigger.classList.add('active');
    }
  });

  // اختيار مادة
  // اختيار مادة
optionsContainer.querySelectorAll('.material-option').forEach(option => {
  option.addEventListener('click', () => {

    const key = option.dataset.value;

    // استخدام بيانات الخيار نفسه
    const imgSrc = option.dataset.image;
    const nameText = option.dataset.name;
    const valueText = option.querySelector('.material-option-value').textContent;

    originalSelect.value = key;
    originalSelect.dispatchEvent(new Event('change'));

    // تحديث الصورة
    trigger.querySelector('.material-img').src = imgSrc;
    trigger.querySelector('.material-img').alt = nameText;

    // تحديث النص
    trigger.querySelector('.material-name').textContent = nameText;
    trigger.querySelector('.material-value').textContent = valueText;

    // تحديث التحديد
    optionsContainer.querySelectorAll('.material-option').forEach(opt => {
      opt.classList.remove('selected');
    });

    option.classList.add('selected');

    // إظهار/إخفاء الارتداد المخصص
    const customGroup = document.getElementById('customRestitutionGroup');
    if (customGroup) {
      customGroup.style.display = key === 'custom' ? 'block' : 'none';
    }

    // إغلاق القائمة
    optionsContainer.classList.remove('open');
    trigger.classList.remove('active');
  });
});

  // إغلاق عند النقر خارج القائمة
  document.addEventListener('click', () => {
    optionsContainer.classList.remove('open');
    trigger.classList.remove('active');
  });

  wrapper.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // ✅ تحديث أولي
  const initialKey = originalSelect.value || '0.98';
  const initialMaterial = materialData[initialKey];
  if (initialMaterial) {
    updateTrigger(initialMaterial);
  }
}