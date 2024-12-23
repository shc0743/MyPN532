globalThis.userconfig = Object.create({
    async get(key) {
        try {
            const url = new URL('/api/v4.8/user/web/config', location.href);
            url.searchParams.append('key', key);
            return await (await fetch('/api/v4.8/user/web/config', {
                method: 'POST',
                body: key,
            })).text();
        } catch (error) {
            return null
        }
    },
    async getobject(key) {
        try {
            return JSON.parse(await this.get(key));
        } catch { return new Object }
    },
    async put(key, body) {
        try {
            const url = new URL('/api/v4.8/user/web/config', location.href);
            url.searchParams.append('key', key);
            return await (await fetch(url, {
                method: 'PATCH',
                body,
            })).text();
        } catch (error) {
            throw error
        }
    },
    async putobject(key, body) {
        return await  this.put(key, body);
    },
});



