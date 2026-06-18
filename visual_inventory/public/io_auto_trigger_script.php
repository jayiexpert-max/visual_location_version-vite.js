<?php
require_once __DIR__ . '/../config/io_device_service.php';
// Include this file to provide triggerIOForBox() and optional auto-trigger on load.
// Set $io_skip_auto_trigger = true when PHP already called io_highlight_box() server-side.
$isEN = (__('logout') == 'Logout');
$readyMsg = $isEN ? 'Action completed. Ready for next command.' : 'การทำงานเสร็จสิ้น รอรับคำสั่งใหม่';
$timerMs = io_highlight_duration_sec() * 1000;
?>
<script>
    if (!document.getElementById('swal-css')) {
        let link = document.createElement('link');
        link.id = 'swal-css';
        link.rel = 'stylesheet';
        link.href = 'plugins/sweetalert2/sweetalert2.min.css';
        document.head.appendChild(link);
    }
    if (!window.Swal) {
        let script = document.createElement('script');
        script.src = 'plugins/sweetalert2/sweetalert2.all.min.js';
        document.body.appendChild(script);
    }

    function triggerIOForBox(boxId, slotNo) {
        if (!boxId) return;

        const payload = {
            box_id: boxId,
            action: 'highlight',
            duration_sec: <?= (int) io_highlight_duration_sec() ?>
        };
        if (slotNo) {
            payload.slot_no = slotNo;
        }

        fetch('api_gateway.php?call=trigger_box_io.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'warning') {
                console.warn('IO:', data.message);
                return;
            }
            if (data.status !== 'success') {
                console.error('IO Error:', data.message || data);
                return;
            }

            setTimeout(() => {
                fetch('api_gateway.php?call=trigger_box_io.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ box_id: boxId, action: 'off', slot_no: slotNo || undefined })
                }).catch(e => console.error('IO Turn OFF Error', e));

                if (window.Swal) {
                    Swal.fire({
                        title: '<?= $readyMsg ?>',
                        icon: 'success',
                        confirmButtonText: 'OK',
                        allowOutsideClick: false
                    }).then(() => {
                        if (window.location.search || window.location.hash) {
                            window.location.href = window.location.pathname;
                        }
                    });
                } else {
                    alert('<?= $readyMsg ?>');
                }
            }, <?= $timerMs ?>);
        })
        .catch(err => console.error('Error triggering IO', err));
    }

    function resetAllLights() {
        const isEN = <?= json_encode(__('logout') == 'Logout') ?>;
        const confirmMsg = isEN
            ? 'Turn OFF all configured IO outputs?'
            : 'ปิดไฟ output ทั้งหมดที่ตั้งค่าไว้ในระบบ?';
        if (!window.confirm(confirmMsg)) {
            return;
        }

        fetch('api/reset_all_io.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const msg = isEN
                    ? (data.message || 'All lights reset')
                    : ('ดับไฟทั้งหมดแล้ว (' + (data.pin_count || 0) + ' outputs)');
                if (window.Swal) {
                    Swal.fire({ title: msg, icon: 'success', timer: 2500, showConfirmButton: false });
                } else {
                    alert(msg);
                }
                return;
            }
            if (data.status === 'warning') {
                alert(data.message || (isEN ? 'No IO configured' : 'ยังไม่ได้ตั้งค่า IO'));
                return;
            }
            alert((isEN ? 'Error: ' : 'ผิดพลาด: ') + (data.message || 'Unknown error'));
        })
        .catch(err => {
            console.error('Reset all IO error', err);
            alert(isEN ? 'Network error' : 'เชื่อมต่อไม่สำเร็จ');
        });
    }

    <?php if (isset($trigger_box_id) && $trigger_box_id > 0 && empty($io_skip_auto_trigger)): ?>
    document.addEventListener('DOMContentLoaded', function() {
        triggerIOForBox(<?= (int) $trigger_box_id ?>);
    });
    <?php endif; ?>
</script>
