# إصلاح مشكلة وميض صفحة تسجيل الدخول
## تاريخ: 24 يناير 2026

---

## 📋 المشكلة

عند فتح صفحة تسجيل الدخول، كانت تظهر أولاً **شاشة قديمة** بإعدادات افتراضية، ثم بعد ثوانٍ قليلة **تتحول** إلى الشاشة الحديثة مع الإعدادات المخصصة.

### السبب الجذري:

1. كان الـ component يُعرض فوراً مع إعدادات افتراضية محفوظة في `useState`:
   ```javascript
   const [pageSettings, setPageSettings] = useState({
     site_name_ar: "خدمات الحشود",  // إعدادات افتراضية قديمة
     // ...
   });
   ```

2. بالتوازي، كان يتم تحميل الإعدادات من API:
   ```javascript
   useEffect(() => {
     fetchPageSettings();  // يستغرق وقتاً
   }, []);
   ```

3. بعد تحميل الإعدادات من API، كان الـ component يُعاد رسمه مرة أخرى بالإعدادات الجديدة

**النتيجة:** ظهور شاشتين متتاليتين - مما يخلق تجربة مستخدم سيئة (Flash of Old Content - FOOC)

---

## ✅ الحل المُطبق

### 1. إضافة Loading State

أضفنا `settingsLoading` state لتتبع حالة تحميل الإعدادات:

```javascript
const [settingsLoading, setSettingsLoading] = useState(true);
```

### 2. تحديث fetchPageSettings

عدّلنا الدالة لتحديث الـ loading state عند انتهاء التحميل:

```javascript
const fetchPageSettings = async () => {
  try {
    const response = await axios.get(`${API}/settings/login-page`);
    setPageSettings(response.data);
  } catch (error) {
    console.error("Error fetching login settings:", error);
  } finally {
    setSettingsLoading(false);  // ✅ هنا التعديل
  }
};
```

### 3. إضافة شاشة تحميل

أضفنا شاشة تحميل بسيطة وأنيقة تظهر أثناء تحميل الإعدادات:

```javascript
if (settingsLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F8F6]" dir="rtl">
      <div className="text-center">
        <div 
          className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 animate-pulse shadow-xl"
          style={{ 
            background: `linear-gradient(135deg, ${pageSettings.primary_color}, ${pageSettings.primary_color}dd)` 
          }}
        >
          <div className="rounded-full bg-white/30 w-16 h-16 flex items-center justify-center">
            <span className="text-white font-cairo font-bold text-3xl">ح</span>
          </div>
        </div>
        <p className="text-gray-600 font-cairo text-lg">جاري التحميل...</p>
      </div>
    </div>
  );
}
```

---

## 🎯 النتيجة

**قبل الإصلاح:**
1. ⏱️ 0s: تظهر الشاشة القديمة (إعدادات افتراضية)
2. ⏱️ ~2s: تتحول إلى الشاشة الحديثة (بعد تحميل API)
3. 😣 تجربة مستخدم سيئة - وميض مزعج

**بعد الإصلاح:**
1. ⏱️ 0s: تظهر شاشة تحميل أنيقة
2. ⏱️ ~1-2s: تظهر الشاشة النهائية مباشرة بالإعدادات الصحيحة
3. 😊 تجربة مستخدم سلسة ومحترفة

---

## 📝 الملفات المُعدلة

- **`/app/frontend/src/pages/LoginPage.jsx`**
  - إضافة `settingsLoading` state
  - تحديث `fetchPageSettings()` لاستخدام `finally`
  - إضافة شاشة تحميل

---

## ✅ الخلاصة

تم حل مشكلة الوميض بنجاح! الآن الصفحة:
- ✅ تظهر شاشة تحميل أثناء جلب الإعدادات
- ✅ تُعرض مباشرة بالإعدادات النهائية (بدون وميض)
- ✅ تقدم تجربة مستخدم سلسة ومحترفة

---

## 🔍 ملاحظة للنشر

هذا الإصلاح يعمل محلياً بشكل مثالي. بعد **إعادة النشر** (Redeploy)، سيتم تطبيق التعديلات على البيئة المنشورة أيضاً.
