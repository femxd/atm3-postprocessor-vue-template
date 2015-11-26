fis.set("atm", {
    useSprite: true, // 是否在开发阶段使用雪碧图合并
    useOptimize: false, // 是否压缩css
    useHash: false, // 是否给文件名加上hash值
    userName: 'minminma', // RTX用户名
    projectName: '150908-native-v6', // 项目名称
    wapstatic: 'http://wapstatic.kf0309.3g.qq.com/', // 默认测试环境网页访问地址
    cdnPath: '' // 上传到CDN的路径, 类似于/2015/market/allanyu, 注意: 必须从/MIG-WEB的子目录开始/2015/qqbrowser/novel/img/
});

fis.set('project.files', ['**', '.**', '.**/**'])
    .set('project.ignore', ['node_modules/**', '.idea/**', '.gitignore', '**/_*.scss', '.docs/**',
        'publish/**', '.dist/**', '.git/**', '.svn/**', 'gruntfile.js', 'gulpfile.js', 'fis-conf.js'
    ])
    .set("project.fileType.text", "hbs");

fis.hook('relative');

if (!!fis.get("atm").cdnPath) {
    fis.get("atm").useDomain = !!fis.get("atm").cdnPath;
    fis.get("atm").domain = "http://3gimg.qq.com/mig-web/" + fis.get("atm").cdnPath;
}

var atmConf = fis.get("atm");

/*************************目录规范*****************************/
fis.match('*', {
    relative: true,
    useHash: false,
    useDomain: false,
    domain: atmConf.domain,
    _isResourceMap: false
}).match(/.*\.(html|htm|php)$/, { //页面模板不用编译缓存
    useCache: false,
}).match(/\/css(?:.*\/)(.*)\.(?:css|less)/i, {
    useSprite: atmConf.useSprite,
    useDomain: atmConf.useDomain,
    useHash: atmConf.useHash,
    spriteRelease: '/img/$1.png',
    optimizer: atmConf.useOptimize && fis.plugin('clean-css')
}).match('/css/**.less', {
    rExt: '.css',
    parser: fis.plugin('less')
}).match('*.mixin.less', { //less的mixin文件无需发布
    release: false
}).match("/design/**", {
    release: false
}).match("/scss/**", {
    release: false
}).match("/font/**", {
    useHash: atmConf.useHash,
    useDomain: atmConf.useDomain
}).match("/img/**", {
    useDomain: atmConf.useDomain,
    useHash: atmConf.useHash
}).match('/img/**.png', {
    optimizer: fis.plugin('png-compressor')
}).match('/js/**', {
    useDomain: atmConf.useDomain,
    useHash: atmConf.useHash
}).match('/mail/**', {
    useCompile: false
}).match('/slice/**', {
    useDomain: atmConf.useDomain,
    useHash: atmConf.useHash
});

fis.match('**', {
    deploy: fis.plugin('local-deliver', {
        to: './publish'
    })
}).match("::packager", {
    spriter: fis.plugin('csssprites', {
        htmlUseSprite: true,
        layout: 'matrix',
        margin: '16',
        scale: 0.5,
        styleReg: /(<style(?:(?=\s)[\s\S]*?["'\s\w\/\-]>|>))([\s\S]*?)(<\/style\s*>|$)/ig
    }),
    postpackager: [fis.plugin('list-html'), fis.plugin('open', {
        baseUrl: atmConf.wapstatic + atmConf.userName + '/' + atmConf.projectName
    })]
});

fis.media('test')
// .match("/css/**.{css,less}", {
//     useSprite: true,
//     optimizer: atmConf.useOptimize && fis.plugin('clean-css')
// })
.match('**', {
    deploy: [fis.plugin('local-deliver', {
        to: './publish'
    }), fis.plugin('http-push', {
        receiver: 'http://ued.wsd.com/receiver/receiver2.php',
        to: '/data/wapstatic/' + atmConf.userName + '/' + atmConf.projectName
    })]
});

// fis.media('cdn').match("/css/**.{css,less}", {
//     useSprite: true,
//     optimizer: atmConf.useOptimize && fis.plugin('clean-css')
// })
// .match('**', {
//     deploy: [fis.plugin('local-deliver', {
//         to: './publish'
//     }), fis.plugin('cdn', {
//         remoteDir: atmConf.cdnPath,
//         uploadUrl: 'http://super.kf0309.3g.qq.com/qm/upload'
//     })]
// });
fis.match("::packager", {
    prepackager: fis.plugin('mod', {
        html: 'html/**.html',
        mod: 'E:/wap_static_proj/guide/qqbrowser/',
        sub: {
            'sub-novel-store': 'scss/sub-novel-store.import.scss',
            'sub-novel-booklist': 'scss/sub-novel-booklist.import.scss',
            'sub-novel-club': 'scss/sub-novel-club.import.scss',
            'sub-novel-discovery': 'scss/sub-novel-discovery.import.scss',
            'sub-novel-purchase': 'scss/sub-novel-purchase.import.scss',
            'sub-novel-user': 'scss/sub-novel-user.import.scss',
            'sub-novel-afterread': 'scss/sub-novel-afterread.import.scss',
        },
    })
})
