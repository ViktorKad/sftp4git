(() => {
    'use strict';
    const spawn = require('child_process').spawn;

    /**
     * Класс реализующий работу с sftp.
     * 
     * @param {String} host               Хост, к которому подключаемся
     * @param {String} username           Имя пользователя
     * @param {String} [pubKeyPath]       Путь к публичному ключу
     * @param {Function} [stdoutListener] Вызывается на вывод в stdout. В нее еданственным аргументом передается stdout.
     * @param {Function} [stderrListener] Вызывается на вывод в stderr. В нее еданственным аргументом передается stderr.
     * @param {Function} [closeListener]  Вызывается при выходе. В нее еданственным аргументом передается код завершения.
     */
    let Sftp = function(host, username, localPath, serverPath, pubKeyPath, stdoutListener, stderrListener, closeListener) {
        this._host = host;
        this._username = username;
        this._pubKeyPath = pubKeyPath;
        this._localPath = localPath;
        this._serverPath = serverPath;
        this.setStdoutListener(stdoutListener);
        this.setStderrListener(stderrListener);
        this.setCloseListener(closeListener);
        this._encoding = 'utf8';
        this._connection = null;
        this._isConnected = false;
        this._isClose = false;
        this._connections.push(this);
    }

    Sftp.prototype = {
        /**
         * Список ссылок на все созданные Sftp инстансы.
         * @type {Array|Sftp}
         */
        _connections: [],
        getHost: function() {
            return this._host;
        },
        getUsername: function() {
            return this._username;
        },
        getLocalPath: function() {
            return this._localPath;
        },
        getServerPath: function() {
            return this._serverPath;
        },
        /**
         * Создать подключение по sftp.
         * @param  {Function} callback Исполняется в случае успешного подключения.
         * @return {void}
         */
        connect: function(callback) {
            if(this._isConnected) {
                return;
            }

            this._connection = spawn('sftp', [`${this._username}@${this._host}`]);

            this._connection.stdout.on('data', function(data) {
                this._stdoutListener(String(data));
            }.bind(this));

            this._connection.stderr.on('data', function(err) {
                if(!this._isConnected && /^Connected\sto/.test(String(err))) {
                    this._isConnected = true;
                    callback.call(this);
                } else {
                    this._stderrListener(String(err));
                }
            }.bind(this));

            this._connection.on('close', function(code) {
                this._closeListener(String(code));
            }.bind(this));
        },
        setStdoutListener: function(stdoutListener) {
            this._stdoutListener = stdoutListener || function() {};
        },
        setStderrListener: function(stderrListener) {
            this._stderrListener = stderrListener || function() {};
        },
        setCloseListener: function(closeListener) {
            this._closeListener = closeListener || function() {};
        },
        cd: function(path) {
            this.exec(`cd ${path}`);
        },
        pwd: function() {
            this.exec('pwd');
        },
        ls: function(path) {
            this.exec('ls');
        },
        mkdir: function(path) {
            this.exec(['mkdir', path].join(' '));
        },
        rm: function(path) {
            let absPath = this.getServerPath() + path;

            if(/\/$/.test(path)) {
                this.exec(['rmdir', absPath].join(' '));
            } else {
                this.exec(['rm', absPath].join(' '));
            }
        },
        putFile: function(lPath, rPath) {
            let absLPath = this.getLocalPath() + lPath,
                absSPath = this.getServerPath() + rPath,
                tmpSPath = '',
                tmpAbsSPath;

            // TODO: сделать проверку наличия папки
            tmpAbsSPath = absSPath
                .split('/')
                .filter(item => item);

            tmpAbsSPath.splice(tmpAbsSPath.length - 1, 1);

            tmpAbsSPath.forEach(function(item) {
                    tmpSPath += `/${item}`;
                    this.mkdir(tmpSPath);
                }, this);

            this.exec(['put', absLPath, absSPath].join(' '));
        },
        putDirectory: function(lPath, rPath) {
            // TODO: Копипасту убери
            let absLPath = this.getLocalPath() + lPath,
                absSPath = this.getServerPath() + rPath,
                tmpSPath = '',
                tmpAbsSPath;

            // TODO: сделать проверку наличия папки
            tmpAbsSPath = absSPath
                .split('/')
                .filter(item => item);

            tmpAbsSPath.splice(tmpAbsSPath.length - 1, 1);

            tmpAbsSPath.forEach(function(item) {
                    tmpSPath += `/${item}`;
                    this.mkdir(tmpSPath);
                }, this);

            this.mkdir(absSPath);

            this.exec(['put', '-r', absLPath, tmpSPath].join(' '));
        },
        get: function(rPath, lPath) {
            return;
            // this.exec(['get', rPath, lPath].join(' '));
        },
        exit: function() {
            this.close();
        },
        close: function() {
            this.exec('exit');
            this._isClose = !this._isClose;
        },
        /**
         * Закрыть все подключения по sftp.
         * Закрывает подключения всех инстансов класса Sftp.
         * @return {void}
         */
        closeAll: function() {
            this._connections.forEach((item) => {
                item.close();
            });
        },
        /**
         * Выполнить произвольную команду.
         * Соответствующий вывод отдается в stdoutListener и stderrListener.
         * @param  {String} cmd Команда, которую нужно выполнить по sftp.
         * @return {void}
         */
        exec: function(cmd) {
            if(this._isConnected && !this._isClose) {
                this._connection.stdin.write(`${cmd.trim()}\n`, this._encoding);
            }
        }
    }

    if(typeof module !== 'undefined' && module.exports) {
        module.exports = Sftp;
    }

})();
