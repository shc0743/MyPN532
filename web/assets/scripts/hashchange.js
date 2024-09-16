export default {
    "#/tag/read"(hash) {
        this.$data.current_page = 'tag/read';
    },
    "#/tag/mfclassic/read"(hash) {
        this.$data.current_page = 'tag/mfclassic/read';
    },
    "#/tag/ntag/read"(hash) {
        this.$data.current_page = 'tag/ntag/read';
    },
    "#/tag/mfclassic/write"(hash) {
        this.$data.current_page = 'tag/mfclassic/write';
    },
    "#/tag/ntag/write"(hash) {
        this.$data.current_page = 'tag/ntag/write';
    },

    "#/tag/write"(hash) {
        this.$data.current_page = 'tag/write';
    },
    "#/tag/mfclassic/write"(hash) {
        this.$data.current_page = 'tag/mfclassic/write';
    },
    "#/tag/ntag/write"(hash) {
        this.$data.current_page = 'tag/ntag/write';
    },

    "#/dumps/"(hash) {
        this.$data.current_page = 'dumps';
    },
    "#/dump/"(hash) {
        this.$data.current_page = 'dump';
    },
    
    "#/tag/keys/"(hash) {
        this.$data.current_page = 'tag/keys';
    },

    "#/ndef/"(hash) {
        this.$data.current_page = 'ndef';
    },

    "#/utilities/"(hash) {
        this.$data.current_page = 'utilities';
    },
    "#/utility/devicedetection/"(hash) {
        this.$data.current_page = 'nfcdevicedetection';
    },
    "#/utility/taginfo/"(hash) {
        this.$data.current_page = 'taginfo';
    },

    "#/launchcmd/"(hash) {
        fetch('/api/v4.8/native/launchcmd', { method: 'POST' }).catch(e => {})
        history.replaceState({}, document.title, '#/');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    },

    "#/settings/"(hash) {
        this.$data.current_page = 'settings';
    },
    "#/about/"(hash) {
        this.$data.current_page = 'about';
    },

    "#/exit/"(hash) {
        fetch('/api/v4.8/app/exit', { method: 'POST' }).then(() => close()).catch(e => {})
        history.replaceState({}, document.title, '#/');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    },
    
};