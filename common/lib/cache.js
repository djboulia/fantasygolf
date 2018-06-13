/**
 *
 * implement a simple caching mechanism for web content
 *
 * @param ttl : cache time in seconds
 *
 **/
var Cache = function(ttl) {
    this.ttl = ttl;
    this.cache = {};

    this.get = function(key) {
        var entry = this.cache[key];
        var data = null;

        if (entry) {
            // check the time stamp to see if it's a stale entry
            if (Date.now() - entry.timestamp > ttl * 1000) {
                console.log("cache hit for " + key + ", but entry expired");

                this.cache[key] = undefined;
            } else {
                console.log("cache hit for " + key);

                data = this.cache[key].data;
            }
        } else {
            console.log("no cache entry for " + key);
        }

        // make a copy of the returned value
        return JSON.parse(JSON.stringify(data));
    };

    this.put = function(key, obj) {
        if (obj) {
            console.log("setting cache entry for " + key);

            var copy = JSON.parse(JSON.stringify(obj));

            this.cache[key] = {
                "data": copy,
                "timestamp": Date.now()
            };
        } else {
            this.cache[key] = undefined;
        }
    };
};

module.exports = Cache;
