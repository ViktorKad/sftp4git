(() => {
    'use strict';

    /**
     * Класс реализующий работу с localStorage.
     * Нет защиты от отсутствия localStorage, т.к. точно известно окружение.
     */
    let History = function() {
        if(this._instance) {
            return;
        }

        let ls = this.getLS();

        this._connections = ls[this._keyConnections];
        this._files = ls[this._keyFiles];

        this._instance = this;
    }

    History.prototype = {
        _instance: null,
        _keyFiles: 'sftp4git.files',
        _keyConnections: 'sftp4git.connections',
        _maxFilesHistory: 30,
        _maxConnectionsHistory: 5,
        _connections: [],
        _files: [],
        getLS: function() {
            let res = {};

            res[this._keyConnections] = JSON.parse(localStorage.getItem(this._keyConnections)) || [];
            res[this._keyFiles] = JSON.parse(localStorage.getItem(this._keyFiles)) || [];

            return res;
        },
        getFiles: function() {
            return this._files;
        },
        getConnections: function() {
            return this._connections;
        },
        /**
         * Сохраняет в localStorage список файлов.
         * @return {void}
         */
        _saveFilesToLS: function() {
            localStorage.setItem(this._keyFiles, JSON.stringify(this._files));
        },
        /**
         * Сохраняет в localStorage список подключений.
         * @return {void}
         */
        _saveConnectionsToLS: function() {
            localStorage.setItem(this._keyConnections, JSON.stringify(this._connections));
        },
        /**
         * Добавить файл в историю.
         * @param {String} path Полный Путь к добавляемому файлу
         */
        addFile: function(path) {
            let pathIndex = this._files.indexOf(path);
            
            if(pathIndex !== -1) {
                this._files.splice(pathIndex, 1)
            }

            this._files.unshift(path);

            if(this._files.length > this._maxFilesHistory) {
                this._files.splice(
                    this._maxFilesHistory,
                    this._files.length - this._maxFilesHistory
                );
            }

            this._saveFilesToLS();
        },
        addConnecntion: function(username, server, repoPath, serverPath) {
            let isNewRecord = this.getConnections().map(item => {
                return item.username !== username
                    || item.server !== server
                    || item.repoPath !== repoPath
                    || item.serverPath !== serverPath;
            }).reduce((prev, current) => {return prev && current});
            
            if (!isNewRecord) {
                return;
            }
            
            this._connections.unshift({
                username: username,
                server: server,
                repoPath: repoPath,
                serverPath: serverPath
            });

            if(this._connections.length > this._maxConnectionsHistory) {
                this._connections.splice(
                    this._maxConnectionsHistory,
                    this._connections.length - this._maxConnectionsHistory
                );
            }

            this._saveConnectionsToLS();
        },
        removeConnection: function(id) {
            this._connections.splice(parseInt(id, 10) - 1, 1);

            this._saveConnectionsToLS();
        },
        removeAllConnections: function() {
            this._connections = [];

            this._saveConnectionsToLS();
        },
        removeAllFiles: function() {
            this._files = [];

            this._saveFilesToLS();
        },
        clearAll: function() {
            this.removeAllConnections();
            this.removeAllFiles();
        }
    }

    if(typeof module !== 'undefined' && module.exports) {
        module.exports = History;
    }
})();
