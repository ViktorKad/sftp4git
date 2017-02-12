// Нужен git 1.85+ (В нем запилили поддержку -С)
// Нужен sftp

// В планах:
// * Добавить разделение по цвету удаленных, измененных, созданных файлов
// * Проверку наличия ПО на компе
// * История не фильтруется по репозиторию

'use strict';

(function() {
    'use strict';
    Element.prototype.hasClass = function(hClass) {
        if (this.className.split(' ').indexOf(hClass) !== -1) {
            return true;
        }

        return false;
    }

    Element.prototype.addClass = function(nClass) {
        nClass = nClass || '';

        var cls = (this.className === '') ? [] : this.className.split(' ');

        if (!this.hasClass(nClass)) {
            cls.push(nClass);
            this.className = cls.join(' ');
        }

        return this;
    }

    Element.prototype.removeClass = function(rClass) {
        rClass = rClass || '';

        var cls = this.className.split(' '),
            clsIndex = cls.indexOf(rClass);

        if (this.hasClass(rClass)) {
            cls.splice(clsIndex, 1);
            this.className = cls.join(' ');
        }

        return this;
    }

    Element.prototype.html = function(elem) {
        if(typeof elem === 'undefined') {
            return this.innerHTML;
        }

        this.innerHTML = (elem instanceof Element) ? elem.outerHTML : elem;
        return this;
    }

    Element.prototype.attr = function(name, value) {
        if (typeof value === 'undefined') {
            return this.getAttribute(name);
        }

        this.setAttribute(name, value);

        return this;
    }

    Element.prototype._appendElem = function(elem) {
        if (elem instanceof Element) {
            this.appendChild(elem);
        } else if (typeof elem === 'string') {
            this.innerHTML += elem;
        }
        
        return this;
    }

    Element.prototype.append = function(elems) {
        var self = this;

        if (elems instanceof Array) {
            elems.forEach((elem) => self._appendElem(elem))
        } else {
            this._appendElem(elems);
        }
        
        return this;
    }

    NodeList.prototype.addClass = function(nClass) {
        for (var i = 0; i < this.length; i++) {
            this[i].addClass(nClass);
        }

        return this;
    }

    NodeList.prototype.removeClass = function(rClass) {
        for (var i = 0; i < this.length; i++) {
            this[i].removeClass(rClass);
        }

        return this;
    }

    NodeList.prototype.html = function(elem) {
        for (var i = 0; i < this.length; i++) {
            this[i].html(elem);
        }

        return this;
    }
})();


let create = {
    putFileLine: function(path) {
        'use strict';

        // TODO: Добавить информер о том, что файл отправлен

        let htmlPath = '<div class="inl-blk">' +
                path.replace(/\//g, '/</div><div class="inl-blk">') +
                '</div>',
            cellPath = document.createElement('div')
                .addClass('cell')
                .html(htmlPath),
            btnWatch = document.createElement('div')
                .addClass('btn')
                .addClass('margin-top')
                .attr('onclick', `autoWatchToggle('${path}')`);

            if(state.watchableFiles.indexOf(path) === -1) {
                btnWatch
                    .addClass('btn-green')
                    .html('Следить');
            } else {
                btnWatch
                    .addClass('btn-red')
                    .html('Не&nbsp;следить');
            }

        let cellBtns = document.createElement('div')
            .addClass('cell')
            .append([
                document.createElement('div')
                    .addClass('btn')
                    .attr('onclick', `putFile('${path}')`)
                    .html('Отправить'),
                btnWatch
            ]);

        return document.createElement('div')
            .addClass('line')
            .addClass('bordered')
            .addClass('vertical_padding')
            .append(cellPath)
            .append(cellBtns);
    },
    quickConnectBtn: function(username, server, repoPath, serverPath) {
        'use strict';
        if(typeof arguments[0] === 'object') {
            username = arguments[0].username;
            server = arguments[0].server;
            repoPath = arguments[0].repoPath;
            serverPath = arguments[0].serverPath;
        }
        
        let tmpLocalRepoPath = repoPath;
        let tmpServerRepoPath = serverPath;
        
        let connectDescription = [
            document.createElement('div')
                .addClass('text-small')
                .html(`Local: ${repoPath}`),
            document.createElement('div')
                .addClass('text-small')
                .html(`Server: ${serverPath}`)
        ].map(item => item.outerHTML).join('');
        
        let textBuffer = [];
        
        textBuffer.push('<div class="text-right h3">');
        tmpLocalRepoPath = tmpLocalRepoPath.split('/').filter(item => item.trim());
        textBuffer.push(tmpLocalRepoPath[tmpLocalRepoPath.length - 1]);
        textBuffer.push(' -> ');
        tmpServerRepoPath = tmpServerRepoPath.split('/').filter(item => item.trim());
        textBuffer.push(tmpServerRepoPath[tmpServerRepoPath.length - 1]);
        textBuffer.push('</div>');
        
        textBuffer.push(document.createElement('div')
            .addClass('text-small')
            .html(`${username}@${server}`)
            .outerHTML);
        
        textBuffer.push(connectDescription);

        let onclickText = [
            'fillEnterData(',
            `'${repoPath}', `,
            `'${username}', `,
            `'${server}', `,
            `'${serverPath}'`,
            ')'
        ].join('');
        
        return document.createElement('div')
            .addClass('line')
            .addClass('preset')
            .attr('title', `Быстрое подключение\n${repoPath}\n${username}\n${server}\n${serverPath}`)
            .attr('onclick', onclickText)
            .append([
                document.createElement('div')
                    .addClass('preset__name')
                    .html(textBuffer.join(''))
                // TODO: когда-нибудь реализовать удаление
                // document.createElement('span')
                //     .addClass('preset__remove')
                //     .attr('title', 'Удалить')
                //     .html('x')
            ])
    }
};

const fs = require('fs'),
    Sftp = require('./class/Sftp.js'),
    Git = require('./class/Git.js'),
    History = require('./class/History.js');

window.onload = function() {
    'use strict';

    init();

    repaint.all();
}

window.state = {
    git: null,
    sftp: null,
    history: new History(),
    title: '',
    status: 'Не подключен',
    lastGitUpdTime: 'будущем',
    actualList: [],
    watchableFiles: []
};

window.repaint = {
    status: function(status, lastGitUpdTime) {
        status = (typeof status !== 'undefined') ? status : state.status;
        lastGitUpdTime = 
            (typeof lastGitUpdTime !== 'undefined') ? lastGitUpdTime : state.lastGitUpdTime;

        state.status = status;
        state.lastGitUpdTime = lastGitUpdTime;

        document.querySelector('.info__connection-status').html(status);
        document.querySelector('.info__last-update').html(lastGitUpdTime);
    },
    actualList: function() {
        'use strict';

        const TEXT_EMPTY = 'Пока тут пусто';
        let files = state.actualList;

        document.querySelector('.actual__list').html(
            files.map(path => create.putFileLine(path).outerHTML).join('') || TEXT_EMPTY
        );
    },
    historyList: function() {
        'use strict';

        const TEXT_EMPTY = 'Пока тут пусто';
        let files = state.history.getFiles();

        document.querySelector('.history__list').html(
            files.map(path => create.putFileLine(path).outerHTML).join('') || TEXT_EMPTY
        );
    },
    connectionsHistory: function() {
        'use strict';

        const TEXT_EMPTY = '';
        let files = state.history.getConnections();

        document.querySelector('.connections__history').html(
            files.map(obj => create.quickConnectBtn(obj).outerHTML).join('') || TEXT_EMPTY
        );
    },
    title: function(title) {
        'use strict';

        title = (typeof title !== 'undefined') ? title : state.title;
        state.title = title;

        document.querySelector('.head__connection-name').html(title);
    },
    all: function() {
        'use strict';
        for(let key in this) {
            if(this.hasOwnProperty(key) && typeof this[key] === 'function' && key !== 'all') {
                this[key]();
                
            }
        }
    }
};

function fillEnterData(repo, username, host, serverPath) {
    document.querySelector('.input__repo').value = repo;
    document.querySelector('.input__username').value = username;
    document.querySelector('.input__server_name').value = host;
    document.querySelector('.input__server_path').value = serverPath;
}

function tryConnect(repo, username, host, serverPath) {
    let error = null;

    repo = repo || document.querySelector('.input__repo').value;
    username = username || document.querySelector('.input__username').value;
    host = host || document.querySelector('.input__server_name').value;
    serverPath = serverPath || document.querySelector('.input__server_path').value;

    if(!repo) { error = 'Не введен репозиторий.'; }
    if(!username) { error = 'Не введен логин.'; }
    if(!host) { error = 'Не введено имя сервера.'; }
    if(!serverPath) { error = 'Не введен путь на сервере.'; }

    if(!(/^\//.test(repo)) || !(/^\//.test(serverPath))) {
        error = 'Неверный формат пути. Абсолютный путь должен начинаться с корня ( / ).'; 
    }

    if(error !== null) {
        document.querySelector('.log')
            .removeClass('close')
            .addClass('open')
            .html('Не удается подключиться. ' + error)
        return;
    } else {
        document.querySelector('.log').html('');
    }

    repo = (repo[repo.length - 1] === '/') ? repo : repo + '/';
    serverPath = (serverPath[serverPath.length - 1] === '/') ? serverPath : serverPath + '/';

    state.history.addConnecntion(username, host, repo, serverPath);

    state.git = new Git(repo);
    if(state.sftp) {state.sftp.close();}
    state.sftp = new Sftp(host, username, repo, serverPath);

    repaint.status('Опрашиваю Git');

    state.git.shortStatus(gitShortStatusProcessing);

    fs.watchFile([state.git.getPath(), '.git'].join(''), function(curr, prev) {
        // TODO: Подумать, как правильно (atime - неверно)
        if(curr.atime.getTime() === prev.atime.getTime()) {
            return;
        }

        state.git.shortStatus(gitShortStatusProcessing);
    });
    
    document.querySelector('.main-menu__content').removeClass('open').addClass('close');
    document.querySelector('.content').removeClass('close').addClass('open');
    document.querySelector('.log').removeClass('close').addClass('open');
    
    document.querySelector('.tip__repo').html(repo);
    document.querySelector('.tip__server-path').html(serverPath);

    popup.open([
        'Производится попытка подключения, пожалуйста подождите.',
        ' Это может занаять около минуты.',
        `<div>Пользователь: <span class="text-blue">${username}</span></div>`,
        `<div><span class="text-green">${repo}</span></div>`,
        `<div>Сервер: <span class="text-blue">${host}</span></div>`,
        `<div><span class="text-green">${serverPath}</span></div>`,
    ].join(''));

    state.sftp.setStdoutListener((stdo) => {
        document.querySelector('.log').html('stdout: ' + stdo);
    });
    state.sftp.setStderrListener((err) => {
        document.querySelector('.log').html('stderr: ' + err);
    });
    state.sftp.setCloseListener((code) => {
        document.querySelector('.log').html('');
        popup.open('Sftp connection звершен с кодом: ' + code);
    });

    state.sftp.connect(sftpConnectDone);

    repaint.connectionsHistory();
}

function sftpConnectDone() {
    let gitRepo = state.git.getPath()
        .split('/')
        .filter(item => item);
    gitRepo = gitRepo[gitRepo.length - 1];

    popup.close();

    state.status = 'Подключен';
    repaint.status()

    state.title = [
        state.sftp.getUsername(),
        '@',
        state.sftp.getHost(),
        ' (Репозиторий ',
        gitRepo,
        ')'
    ].join('');
    repaint.title();
}

function gitShortStatusProcessing(stdout) {
    state.actualList = String(stdout)
        .split('\n')
        .map((item) => item.trim())
        .filter((item) => item)
        .map((item) => {
            return item.split(' ').slice(1).join(' ');
        });

    let time = new Date(),
        h = String(time.getHours()),
        m = String(time.getMinutes()),
        s = String(time.getSeconds());

    state.lastGitUpdTime = [
        (h.length === 1 ? '0' + h : h),
        ':',
        (m.length === 1 ? '0' + m : m),
        ':',
        (s.length === 1 ? '0' + s : s)
    ].join('');

    repaint.actualList();
    repaint.status();
}

function disconnect() {
    if(state.sftp) {
        state.sftp.close();
    }

    if(state.git) {
        fs.unwatchFile([state.git.getPath(), '.git'].join(''));
    }

    repaint.status('Отключен');
}

function putFile(path) {
    if(!path || !state.sftp) {
        return;
    }

    state.history.addFile(path);
    repaint.historyList();

    fs.stat(state.sftp.getLocalPath() + path, function(err, stats) {
        if(/no\ssuch\sfile\sor\sdirectory/.test(err)) {
            state.sftp.rm(path);
        } else if(stats.isDirectory()) {
            state.sftp.putDirectory(path, path);
        } else if(stats.isFile()) {
            state.sftp.putFile(path, path);
        }
    });
}

/**
 * [repaint] по умолчанию true
 */
function autoWatchToggle(path, repaint) {
    let fileIndex = state.watchableFiles.indexOf(path);

    if(fileIndex !== -1) {
        fs.unwatchFile([state.git.getPath(), path].join(''));
        state.watchableFiles.splice(fileIndex, 1);
    } else {
        fs.watchFile([state.git.getPath(), path].join(''), function(curr, prev) {
            // TODO: Подумать, как правильно (atime - неверно)
            if(curr.mtime.getTime() === prev.mtime.getTime()) {
                return;
            }

            putFile(path);
        });

        state.watchableFiles.push(path);
    }
    
    if (repaint || typeof repaint === 'undefined') {
        window.repaint.actualList();
        window.repaint.historyList();
    }
}

function pushAllGitFiles() {
    state.actualList
        .forEach(path => putFile(path));
}

function watchAllGitFiles() {
    state.actualList
        .filter(item => state.watchableFiles.indexOf(item) === -1)
        .forEach(item => autoWatchToggle(item, false));
    window.repaint.actualList();
    window.repaint.historyList();
}

function unwatchAllGitFiles() {
    // Работаем с его копией, чтобы оригинал не изменяется в процессе обхода
    state.watchableFiles
        .splice(0)
        .forEach(item => autoWatchToggle(item));
    window.repaint.actualList();
    window.repaint.historyList();
}

function init() {
    window.popup = {
        _htmlPopup: document.querySelector('.popup'),
        _htmlPopupText: document.querySelector('.popup__text'),
        _htmlParanja: document.querySelector('.paranja'),
        open: function(text) {
            this._htmlPopupText.html(text || '');

            this._htmlPopup.removeClass('close').addClass('open');
            this._htmlParanja.removeClass('close').addClass('open');
        },
        close: function() {
            this._htmlPopup.removeClass('open').addClass('close');
            this._htmlParanja.removeClass('open').addClass('close');
        }
    };

    document.querySelector('.main-menu__btn-open').onclick = function() {
        let menuContent = document.querySelector('.main-menu__content');
        
        if(menuContent.hasClass('close')) {
            menuContent.removeClass('close');
        } else {
            menuContent.addClass('close');
        }
    }

    document.querySelector('.btn__connect').attr('onclick', 'tryConnect()');

    document.querySelector('.btn__disconnect').onclick = disconnect;
    
    document.querySelector('.btn__push-all').onclick = pushAllGitFiles;
    
    document.querySelector('.btn__watch-all').onclick = watchAllGitFiles;
    
    document.querySelector('.btn__unwatch-all').onclick = unwatchAllGitFiles;
}


(() => {
    'use strict';
    //---------------------------------------------------------------------------
    process.on('exit', (code) => {
        if(state.git) {
            fs.unwatchFile([state.git.getPath(), '.git'].join(''));
        }

        new Sftp().closeAll();
    });
    //---------------------------------------------------------------------------
})();
