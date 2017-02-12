(() => {
    'use strict';

    const exec = require('child_process').exec;

    /**
     * Класс реализующий работу с git репозиторием.
     * Поддерживает очень ограниченный набор функций.
     * @param {String} repoPath Путь до отслеживаемого репозитория.
     */
    let Git = function(repoPath) {
        this.setRepoPath(repoPath);
    }

    Git.prototype = {
        getPath: function() {
            return this._repoPath;
        },
        setRepoPath: function(repoPath) {
            this._repoPath = repoPath;
        },
        shortStatus: function(callback) {
            this._git(['-C', this._repoPath, 'status', '--short'], callback)
        },
        _git: function(flags, callback) {
            exec(['git'].concat(flags).join(' '), function(error, stdout, stderr) {
                if (error === null) {
                    callback(stdout);
                }
            });
        }
    }

    if(typeof module !== 'undefined' && module.exports) {
        module.exports = Git;
    }
})();
