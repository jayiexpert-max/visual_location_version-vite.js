/**
 * Factory UI — shared status checks for scan pages
 */
(function () {
    function setStatus(wrapId, dotId, textId, online, onlineText, offlineText) {
        var wrap = document.getElementById(wrapId);
        var dot = document.getElementById(dotId);
        var text = document.getElementById(textId);
        if (!wrap || !dot || !text) return;
        wrap.classList.remove('is-online', 'is-offline', 'is-pending');
        wrap.classList.add(online ? 'is-online' : 'is-offline');
        text.textContent = online ? onlineText : offlineText;
    }

    function checkPdService() {
        fetch('test_net.php')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var ok = data.status === 'success' && data.step2_api_connection && data.step2_api_connection.status === 'Connected';
                setStatus('apiStatusWrap', 'apiStatusDot', 'apiStatusText', ok, 'PDService Online', 'PDService Offline');
            })
            .catch(function () {
                setStatus('apiStatusWrap', 'apiStatusDot', 'apiStatusText', false, 'PDService Online', 'PDService Offline');
            });
    }

    function checkCpk() {
        fetch('api_gateway.php?call=cpk/get_version.php')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var ok = data.status === 'success';
                setStatus('cpkStatusWrap', 'cpkStatusDot', 'cpkStatusText', ok, 'CPK Online', 'CPK Offline');
            })
            .catch(function () {
                setStatus('cpkStatusWrap', 'cpkStatusDot', 'cpkStatusText', false, 'CPK Online', 'CPK Offline');
            });
    }

    if (document.getElementById('apiStatusWrap')) {
        checkPdService();
    }
    if (document.getElementById('cpkStatusWrap')) {
        checkCpk();
    }
})();
