// ฟังก์ชันสำหรับอ่านไฟล์และแปลงเป็น Base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); 
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

document.getElementById('verifyBtn').addEventListener('click', async function() {
    const emailInput = document.getElementById('emailInput');
    const statusText = document.getElementById('emailStatus');
    const mainForm = document.getElementById('mainFormArea');
    const btn = this;
    const email = emailInput.value.trim();

    if (!email) {
        statusText.innerText = "กรุณากรอกอีเมลก่อนกดตรวจสอบ";
        statusText.style.color = "red";
        return;
    }

    btn.innerText = "กำลังตรวจสอบ...";
    btn.disabled = true;
    statusText.innerText = "";

    try {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL + "?action=checkEmail&email=" + encodeURIComponent(email));
        const data = await response.json();

        if (data.isValid) {
            // ข้อความจะเปลี่ยนเป็นอันนี้เมื่อใช้โค้ดใหม่สำเร็จ
            statusText.innerText = "อีเมลถูกต้อง ระบบดึงข้อมูลให้ท่านเรียบร้อยแล้ว";
            statusText.style.color = "green";
            mainForm.style.display = "block";
            emailInput.readOnly = true; 
            btn.style.display = "none"; 

            // เติมข้อมูลลงช่องกรอกอัตโนมัติ
            document.querySelector('input[name="name"]').value = data.name || "";
            document.querySelector('input[name="position"]').value = data.position || "";
            
            // จับคู่ข้อมูลส่วนงาน (Dropdown)
            const deptSelect = document.querySelector('select[name="department"]');
            if (data.department) {
                for (let i = 0; i < deptSelect.options.length; i++) {
                    if (deptSelect.options[i].value.trim() === data.department.trim()) {
                        deptSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        } else {
            statusText.innerText = "ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีกครั้ง";
            statusText.style.color = "red";
            mainForm.style.display = "none";
        }
    } catch (error) {
        statusText.innerText = "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่";
        statusText.style.color = "red";
        console.error(error);
    } finally {
        btn.innerText = "ตรวจสอบ";
        btn.disabled = false;
    }
});

document.getElementById('trainingForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('submitBtn');
    
    // 1. ดึงข้อมูลจากฟอร์มมาเก็บไว้ก่อนทันที
    let payload = {
        email: form.email.value, // เพิ่มบรรทัดนี้
        name: form.name.value,
        position: form.position.value,
        department: form.department.value,
        course: form.course.value,
        course_attended: form.course_attended.value,
        start_date: form.start_date.value,
        end_date: form.end_date.value,
        completion_date: form.completion_date.value,
        duration: form.duration.value,
        attendance_percent: form.attendance_percent.value,
        status: form.status.value,
        plan_to_apply: form.plan_to_apply.value,
        content_match: form.content_match.value,
        benefits_3_1: form.benefits_3_1.value,
        benefits_3_2: form.benefits_3_2.value,
        results: form.results.value,
        problems: form.problems.value,
        expectations: form.expectations.value
    };

    // เก็บไฟล์ไว้ในตัวแปรก่อนที่ฟอร์มจะถูกรีเซ็ต
    const certFile = document.getElementById('certFile').files[0];
    const extraFile = document.getElementById('extraFile').files[0];

    // 2. แสดงข้อความสำเร็จทันที! โดยไม่ต้องรอ
    alert('ระบบได้รับข้อมูลแล้ว!\n\nข้อมูลและไฟล์ของคุณกำลังถูกอัปโหลดอยู่เบื้องหลัง\n(ข้อควรระวัง: กรุณาอย่าเพิ่งปิดหน้าเว็บทันที ให้เปิดทิ้งไว้สักครู่)');
    
    // รีเซ็ตฟอร์มให้ว่างทันที
    form.reset();
    window.scrollTo(0, 0);

    // เปลี่ยนสถานะปุ่มเพื่อบอกผู้ใช้ว่ากำลังส่งเบื้องหลัง (กันผู้ใช้ปิดหน้าเว็บ)
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = 'กำลังส่งข้อมูลเบื้องหลัง...';
    submitBtn.style.backgroundColor = '#666'; // เปลี่ยนสีปุ่มให้ดูว่ากำลังทำงาน
    submitBtn.disabled = true;

    // 3. ฟังก์ชันประมวลผลเบื้องหลัง (แยกออกมาทำงานเงียบๆ)
    const processInBackground = async () => {
        try {
            if (certFile) {
                payload.certFile = {
                    name: certFile.name,
                    type: certFile.type,
                    base64: await getBase64(certFile)
                };
            }
            if (extraFile) {
                payload.extraFile = {
                    name: extraFile.name,
                    type: extraFile.type,
                    base64: await getBase64(extraFile)
                };
            }

            await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // ข้ามการเตือน Error จาก Browser
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            
            console.log('Background upload completed.');
        } catch (error) {
            console.error('Background Error:', error);
        } finally {
            // เมื่อเบื้องหลังส่งเสร็จ คืนค่าปุ่มกลับมาเป็นปกติ
            submitBtn.innerText = originalBtnText;
            submitBtn.style.backgroundColor = 'var(--mahidol-blue)';
            submitBtn.disabled = false;
        }
    };

    // 4. สั่งให้ทำงานเบื้องหลัง
    processInBackground();
});