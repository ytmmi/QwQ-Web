/**
 * 文字颜 · app.js
 *
 * 设计约束（读改前必看）：
 *   1. 零外部依赖、零图片。所有视觉由字符 + CSS 产生。
 *   2. 所有颜文字一律用 textContent 写入，**绝不拼 innerHTML**。
 *      语料里合法存在半角 < >，一旦拼进 HTML 就会被当成标签吃掉，
 *      甚至（配合数据里的引号）变成注入点。textContent 是这条链上唯一的正确写法。
 *   3. 颜文字本体用 --ff-art（系统 UI 比例字体）排。字符本来就不是等宽的
 *      （空格 0.29em、★ 1.0em、あ 1.0em、꒰ 0.68em），强行拉成等宽会把字形
 *      压扁、把间距撑散。**盲文点阵画（item.pixel）也走同一条比例栈**，
 *      不开等宽特例 —— 理由见 buildArtText() 上方那段。
 *   4. 遇到冷僻字符（偏远小国文字、古文字、数学符号等）不换字体族，
 *      只把 font-family 换到「比例字体在前 + 广覆盖脚本字体在后」的 --ff-sym 栈，
 *      让浏览器逐字形回退，而不是整条换掉。
 */
(function () {
  'use strict';

  var DATA = window.WZY_DATA;

  // ------------------------------------------------------------------ 兜底
  if (!DATA || !Array.isArray(DATA.general)) {
    var grid = document.getElementById('grid');
    if (grid) {
      var msg = document.createElement('div');
      msg.className = 'empty';
      var art = document.createElement('span');
      art.className = 'empty__art';
      art.textContent = '（´・ω・｀）';
      var txt = document.createElement('div');
      txt.textContent = '数据没有加载成功';
      var hint = document.createElement('p');
      hint.className = 'empty__hint';
      hint.textContent = '请刷新页面；若仍然如此，说明构建产物 data.js 缺失。';
      msg.appendChild(art);
      msg.appendChild(txt);
      msg.appendChild(hint);
      grid.appendChild(msg);
    }
    return;
  }

  var GENERAL = DATA.general;
  var LARGE = Array.isArray(DATA.large) ? DATA.large : [];
  // 分片模式下 boot 只是「首页那几十条」，DATA._partial 记录着全量应有多少。
  // 没有 _partial 就是老的全量 data.js（向后兼容：分片可有可无）。
  var PARTIAL = DATA._partial || null;
  var NEEDS_MORE = !!(PARTIAL && (PARTIAL.general > GENERAL.length || PARTIAL.large > LARGE.length));
  // 未分片时数据本来就是全的，直接算就绪；分片模式要等补载完成才置 true。
  DATA.ready = !NEEDS_MORE;
  // 「传统颜文字」不是第三种 kind：它们仍是 kind=general 的短表情
  // （:) :D <3 这类西文 ASCII），只是在导出层被打了 trad 标记。
  // 这样数据库表结构不用改，检索/标签/情绪全都照旧，展示上才分一节。
  // 注意：不要在这里预先拆成 TRAD/PLAIN 两份数组 —— 分栏是在 render()
  // 里按 item.trad 现分的，因为筛选（情绪/标签/搜索/视图）每次都只取
  // 子集，预拆分反而要维护两份镜像状态。
  var MOODS = DATA.meta && DATA.meta.moods ? DATA.meta.moods : {};

  // --------------------------------------------------------------- 冷僻字符
  // 只用于决定「要不要切到符号字体栈」，不影响任何逻辑判断。
  // 覆盖：亚美尼亚 / 希伯来 / 阿拉伯 / 叙利亚 / 它拿 / 埃塞俄比亚 / 切罗基 /
  //       加拿大音节 / 欧甘 / 卢恩 / 泰 / 老挝 / 藏 / 缅甸 / 格鲁吉亚 /
  //       谚文 / 埃塞 / 高棉 / 蒙古 / 林布 / 泰米尔 / 僧伽罗 / 泰卢固 /
  //       古文字补充区（线形B、哥特、古波斯、腓尼基…）/ 盲文 / 数学字母数字 /
  //       带圈字母 / 制表符以外的几何与杂项符号。
  var EXOTIC = /[\u0530-\u058F\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u07C0-\u08FF\u0900-\u0DFF\u0E00-\u0EFF\u0F00-\u0FFF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF\u1200-\u139F\u13A0-\u13FF\u1400-\u167F\u1680-\u169F\u16A0-\u16FF\u1700-\u17FF\u1780-\u17FF\u1800-\u18AF\u1900-\u194F\u1950-\u197F\u1980-\u19DF\u1A00-\u1A1F\u1B00-\u1B7F\u1DC0-\u1DFF\u1E00-\u1EFF\u1F00-\u1FFF\u2000-\u206F\u20A0-\u20CF\u2100-\u214F\u2150-\u218F\u2190-\u21FF\u2200-\u22FF\u2300-\u23FF\u2460-\u24FF\u2500-\u257F\u2580-\u259F\u25A0-\u25FF\u2600-\u26FF\u2700-\u27BF\u27C0-\u27EF\u27F0-\u27FF\u2800-\u28FF\u2900-\u297F\u2980-\u29FF\u2A00-\u2AFF\u2B00-\u2BFF\u2C00-\u2C5F\u2C60-\u2C7F\u2C80-\u2CFF\u2D00-\u2D2F\u2D30-\u2D7F\u2D80-\u2DDF\u2DE0-\u2DFF\u2E00-\u2E7F\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u31C0-\u31EF\u3200-\u32FF\u3300-\u33FF\uA000-\uA48F\uA490-\uA4CF\uA700-\uA71F\uA720-\uA7FF\uA800-\uA82F\uA840-\uA87F\uA880-\uA8DF\uA900-\uA92F\uA930-\uA95F\uA960-\uA97F\uA980-\uA9DF\uAA00-\uAA5F\uAA60-\uAA7F\uAA80-\uAADF\uAB00-\uAB2F\uFB00-\uFB4F\uFB50-\uFDFF\uFE00-\uFE0F\uFE20-\uFE2F\uFE30-\uFE6F\uFE70-\uFEFF\uFF00-\uFFEF]|[\u{10000}-\u{1D7FF}]/u;

  function needsSymStack(s) { return EXOTIC.test(s); }

  // ------------------------------------------------------------------ 复制
  var toast = document.getElementById('toast');
  var toastText = document.getElementById('toastText');
  var toastTimer = 0;

  function showToast(text) {
    if (!toast) return;
    // 守卫是零宽字符，屏幕上不可见：先剥掉再裁剪，长度预算才是「人看到的字数」
    text = unguard(text);
    toastText.textContent = text.length > 44 ? text.slice(0, 44) + '…' : text;
    toast.setAttribute('data-show', '1');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.removeAttribute('data-show');
    }, 1600);
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        done(true);
      }, function () {
        done(legacyCopy(text));
      });
      return;
    }
    done(legacyCopy(text));
  }

  /* ------------------------------------------------------- 行首空白守卫
   *
   * 要解决的问题：点击复制 → 粘进微信 → 发送，气泡里的样子会变。
   *
   * 证据（用户给的 原始 ↔ 发送后再复制 对照，逐字节比对）：
   *   原始       `  ^      ʚɞ^`      ← 行首 2 个 U+0020
   *   二次复制后 `^      ʚɞ^`        ← 那两个空格没了；其余字符一个不差，
   *                                    连 U+0335 组合符号都还在
   * 结论：聊天端剥的是**行首空白**，行内空格与组合符号都安全。
   *
   * 本站大型颜文字全靠行首缩进定义左右位置（73 条、277 行有缩进），
   * 行首被剥 → 整幅画歪掉 → 正是「发送区和聊天区样子不一致」。
   *
   * 解法：在每行行首空白之前插一个 U+2060 WORD JOINER。
   *   · 零宽 —— 实测 advance = 0.0000em，四种字体族都一样，渲染零位移；
   *   · 不是 Unicode White_Space —— trim 类清洗会停在它这里，空格就安全了；
   *   · Cf 格式字符，不需要字形，不会被画成豆腐块。
   * 于是「行首空格」不再是行首，任何基于空白裁剪的清洗都动不到它。
   *
   * 为什么不改成 U+00A0 / U+2007 这类「看得见的空格」：
   *   实测 U+00A0 仍属 White_Space（照样被 trim）；U+2007 前进宽 0.5864em，
   *   而普通空格只有 0.2959em —— 换掉就把画面撑宽一倍。见 build/probe-blank.mjs。
   *
   * 为什么不干脆去掉缩进让每行顶格：
   *   那样画面左右就散了，作者用缩进表达的相对位置全丢，比现在更糟。
   *
   * 回归脚本：build/verify-guard.mjs（渲染零差异 + trim 后逐字还原）。
   */
  var GUARD = '\u2060';
  var LEAD_SPACE = /^[ \u3000]/;

  /** 给每行「行首空白」前加守卫。没有行首空白的行原样不动。 */
  function guardLead(s) {
    return s.split('\n').map(function (line) {
      return LEAD_SPACE.test(line) ? GUARD + line : line;
    }).join('\n');
  }

  /** 显示用：去掉守卫，屏幕上是干净的原文。 */
  function unguard(s) {
    return s.indexOf(GUARD) === -1 ? s : s.split(GUARD).join('');
  }

  /**
   * 条目 → 可粘贴的纯文本。
   *
   * 返回值**带守卫**：多行用 \n 连接，行首空格保留，并在每段行首空白前插 U+2060。
   * 屏幕渲染前会先 unguard() 去掉守卫，所以「站上看到的」与「发出去的」视觉一致，
   * 而发出去的那份在聊天端 trim 之后仍然保留缩进。
   *
   * 复制走出去的就是这个带守卫的版本 —— 这是故意的：零宽字符不影响观感，
   * 但它是缩进在聊天软件里活下来的唯一凭据。
   *
   * 不变量（E2E 有断言）：对返回值做 trim() / 逐行 trim() 后去掉守卫，
   * 必须逐字等于 item.rows.join('\n')。这就是「发送后样子不变」。
   */
  function plain(item) {
    return guardLead(item.rows.join('\n'));
  }

  /** 屏幕显示用：守卫已剥掉，屏幕上就是干净的原文。 */
  function plainDisplay(item) {
    return unguard(plain(item));
  }

  // ------------------------------------------------- 大型颜文字：自然文本流
  /*
   * 为什么不再强行等宽
   * ------------------
   * 早前试过「每个字符塞进一个宽度由模型写死的格子、字形超宽就缩小」，
   * 几何上确实行宽精确等于模型格数，但字形被压到 61%，彼此拉得很散，
   * 和微信里直接看这些颜文字的效果完全不同 —— 因为真实排版里字符本来
   * 就不是等宽的：空格 0.28em、★ 1.0em、あ 1.0em、꒰ 0.68em，各有各的
   * 设计宽度。硬把它们拉成一样宽，等于用一套假想字体去覆盖真实字体。
   *
   * 所以这里退回最简单的做法：一个 <pre>，保留作者写的空格，让浏览器按
   * 字体自身的字宽排布。字体用 --ff-art（系统 UI 优先的比例字体栈，
   * 与微信/系统记事本看到的一致），冷僻字符由栈尾的脚本字体兜底。
   *
   * **盲文点阵画也走同一个比例字体栈，不开等宽特例。**
   * 原因：本站的颜文字是给人复制去发消息的，站上看到的样子必须等于对方
   * 收到时的样子。等宽字体只是本站机器上恰好装着的字体，收信人那边大概率
   * 没有它 —— 在自己机器上把点阵调成正方形，反而让这里成为唯一正确的
   * 环境，等于骗自己。所以全站统一 --ff-art，让「所见」就是「所发」。
   * （代价：比例字体里 U+2800 是 0.6509em、点阵字是 0.7534em，像素画在
   * 本站也会像在微信里一样略微松弛 —— 但这才是它真实的模样。）
   */
  function buildArtText(item, symStack) {
    var pre = document.createElement('pre');
    pre.className = 'art__text';
    if (symStack) pre.className += ' art__text--sym';
    pre.textContent = plainDisplay(item);
    return pre;
  }

  function flashCopied(el) {
    el.setAttribute('data-copied', '1');
    setTimeout(function () { el.removeAttribute('data-copied'); }, 1000);
  }

  function handleCopy(item, el) {
    var text = plain(item);
    copyText(text, function (ok) {
      if (ok) {
        flashCopied(el);
        showToast(text);
      } else {
        // 复制失败时至少把内容选中，方便手动 Ctrl+C
        showToast('复制被浏览器拦截，请手动选中');
      }
    });
  }

  // ------------------------------------------------------------ 颜文字河
  // 每个颜文字都是独立的：自己的高度、字号、速度（px/s）、相位。
  // 没有「泳道」——泳道会让同一横排的字号与速度互相绑死，看起来是几条传送带。
  // 每条元素从屏幕左侧外滚到右侧外，自己循环，因此彼此的间隔与速度完全解耦。
  //
  // 数量按「可用面积」定，而不是按屏宽线性定：手机上 72 个元素挤在 390×190
  // 的窄条里就是一团墨，所以按 每 3600px² 一个元素 折算，再夹在 24–72 之间。
  var RIVER_DENSITY = 3600;

  function riverCount(w, h) {
    var n = Math.round((w * h) / RIVER_DENSITY);
    return Math.max(24, Math.min(72, n));
  }

  function buildRiver() {
    var river = document.getElementById('river');
    if (!river) return;

    // 重建前先清空（resize 时会二次调用）
    river.textContent = '';

    var riverW = river.clientWidth || window.innerWidth;
    var riverH = river.clientHeight || 260;
    var count = riverCount(riverW, riverH);
    // 小屏时字号整体收一档，否则 1.92rem 的颜文字在 390 宽的屏上占掉半行
    var sizeScale = Math.max(0.62, Math.min(1, riverW / 1100));

    // 河里的素材：一般颜文字为主，尽量取单行、宽度适中的。
    // 传统条目（:) :D <3 这类）本来就在 GENERAL 里，非常短，是河里最合适的
    // 填充物 —— 它们占宽小、不抢视线，所以不额外排除。
    var pool = GENERAL.filter(function (it) {
      return it.rows.length === 1 && it.w <= 24;
    });
    if (pool.length < 32) pool = GENERAL.slice();

    // 确定性随机：同一份数据每次刷新布局一致，避免视觉上闪烁不定
    var seed = 20261031 >>> 0;
    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    // 确定性洗牌，保证取到的颜文字不重复扎堆
    function seededShuffle(arr, s0) {
      var out = arr.slice();
      var s = s0 >>> 0;
      for (var i = out.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) >>> 0;
        var j = s % (i + 1);
        var t = out[i]; out[i] = out[j]; out[j] = t;
      }
      return out;
    }
    var shuffled = seededShuffle(pool, 20261031);

    var SIZES_MIN = 0.78 * sizeScale;
    var SIZES_MAX = 1.92 * sizeScale;
    var TOP_MIN = 1.5;
    var TOP_MAX = 98.5;

    // 字号、高度、速度先各自生成一组「两两不同」的值，再打乱顺序分配给元素。
    // 若每个都独立随机取，几十个值里取到重复是几乎必然的（生日悖论），
    // 而「每个颜文字的大小 / 高度 / 速度都是单独的」正是这次的要求。
    var sizePool = [];
    var topPool = [];
    var speedPool = [];
    for (var s = 0; s < count; s++) {
      sizePool.push(SIZES_MIN + (SIZES_MAX - SIZES_MIN) * (s / Math.max(1, count - 1)));
      topPool.push(TOP_MIN + (TOP_MAX - TOP_MIN) * (s / Math.max(1, count - 1)));
      /* 速度同样用「互不相同的等差池」而不是 38 + rand()*48 取整：
         取整后只有 49 个可能值，72 个元素必然出现重复（实测 69/72），
         而重复速度会让两个元素看起来同步，破坏「各自独立」的观感。 */
      speedPool.push(38 + 48 * (s / Math.max(1, count - 1)));
    }
    sizePool = seededShuffle(sizePool, 777);
    topPool = seededShuffle(topPool, 888);
    speedPool = seededShuffle(speedPool, 999);

    var frag = document.createDocumentFragment();
    var made = [];

    for (var i = 0; i < count; i++) {
      var item = shuffled[i % shuffled.length];

      var span = document.createElement('span');
      span.className = 'river__item' + (needsSymStack(item.rows[0]) ? ' river__item--sym' : '');
      span.textContent = item.rows[0];

      // 高度：从上面那组互不相同的值里取，铺满整条动画区
      span.style.setProperty('--top', topPool[i].toFixed(2) + '%');

      // 字号：同样取互不相同的值
      span.style.fontSize = sizePool[i].toFixed(2) + 'rem';

      // 不透明度：越小越淡，拉开层次
      span.style.setProperty('--o', (0.26 + rand() * 0.36).toFixed(2));

      // 速度：每个字自己的 px/s，与字号无关（大字号因此看起来更慢更稳）。
      // 从互不相同的等差池里取，保证 72 个元素没有一个相同速度。
      span.style.setProperty('--speed', speedPool[i].toFixed(2));

      frag.appendChild(span);
      made.push(span);
    }

    river.appendChild(frag);

    // 距离 = 视口宽 + 自身宽（-100% 到 +100vw），故时长要测量后再写，
    // 这样「速度」才是真的 px/s，而不是长短不一的元素被同一个时长拖着走。
    //
    // 时长必须显式去重，两个原因：
    //   1. dur = (视口宽 + 元素宽) / speed 是**测量**出来的连续量。即使 speed
    //      两两不同（上面那个等差池保证了），不同宽度也会让两个元素的 dur
    //      算出同一个值 —— 写进 style 时再按 toFixed 取整，撞值概率更高。
    //   2. E2E 的「每个颜文字速度各不相同」是按 animationDuration 去重的，
    //      所以光有互不相同的 speed 不够，还得有互不相同的 duration。
    // 做法：精确到毫秒写，撞了就往后挪 5ms。5ms 对 px/s 换算的影响远小于
    // E2E 的 2% 容差，肉眼也看不出相位差。
    var usedDur = {};
    for (var k = 0; k < made.length; k++) {
      var el = made[k];
      var w = el.offsetWidth || 120;
      var speed = parseFloat(el.style.getPropertyValue('--speed')) || 55;
      var dur = (riverW + w) / speed;
      var durStr = dur.toFixed(3);
      while (usedDur[durStr]) {
        dur += 0.005;
        durStr = dur.toFixed(3);
      }
      usedDur[durStr] = 1;
      el.style.animationDuration = durStr + 's';
      // 相位：整段错开，任何时刻屏幕上都有各个阶段的元素
      el.style.animationDelay = (-dur * rand()).toFixed(2) + 's';
    }

    lastRiverKey = riverW + 'x' + riverH;
  }

  // 视口尺寸变化到一定程度才重建：手机上地址栏收起会连续触发 resize，
  // 每次都重建整条河会明显掉帧。
  var lastRiverKey = '';
  var riverResizeTimer = 0;
  function scheduleRiverRebuild() {
    var river = document.getElementById('river');
    if (!river) return;
    var key = (river.clientWidth || window.innerWidth) + 'x' + (river.clientHeight || 260);
    if (key === lastRiverKey) return;
    clearTimeout(riverResizeTimer);
    riverResizeTimer = setTimeout(function () {
      if (document.getElementById('river')) buildRiver();
    }, 220);
  }

  // ---------------------------------------------------------------- 网格
  var gridEl = document.getElementById('grid');
  var tradGridEl = document.getElementById('tradGrid');
  var galleryEl = document.getElementById('gallery');
  var sectionTraditional = document.getElementById('traditional');
  var sectionGeneral = document.getElementById('general');
  var sectionLarge = document.getElementById('large');
  var emptyEl = document.getElementById('empty');
  var resultCountEl = document.getElementById('resultCount');
  var moodsEl = document.getElementById('moods');

  // 三个分区的「更多」行容器
  var moreEl = {
    general: document.getElementById('generalMore'),
    traditional: document.getElementById('tradMore'),
    large: document.getElementById('largeMore')
  };
  // 三区的分页状态（在 renderSection 之前声明，供筛选归位使用）
  var paged = {
    general: { expanded: false },
    traditional: { expanded: false },
    large: { expanded: false }
  };

  var REVERSE_MOOD = {};
  Object.keys(MOODS).forEach(function (k) { REVERSE_MOOD[k] = MOODS[k]; });

  /**
   * 一般/传统共用同一种卡片。区别只在展示标记，不在结构：
   *   · 传统条目多一个 data-trad="1"，CSS 据此给极淡的底纹与描边色；
   *   · 传统条目文本多一个 kao__text--trad，做轻微字距调整。
   * 为什么不用等宽字体：契约与 E2E 都明确要求不用等宽族（--ff-mono 会
   * 缺装饰符号字形导致逐字回退）。传统条目也是颜文字，一律 --ff-art。
   */
  function renderGeneralCard(item) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kao';
    var isTrad = item.trad === true;
    // 传统条目按宽度自适应：2–6 个半角字符是绝大多数（用窄卡才排得密），
    // 但语料里也真有几条宽到 13–33 格的长表情（一行排好几个脸）。
    // 窄卡里塞长条只能被 ellipsis 截断 —— 那就等于把内容藏起来了。
    // 所以宽度 ≥ 12 的传统卡跨两列（CSS 里 .kao--trad--wide 才生效）。
    // 阈值 12 是实测出来的：w=13 的「UwU [[t]] OwO」在单列里溢出 10px。
    if (isTrad) {
      btn.className += ' kao--trad';
      if (item.w >= 12) btn.className += ' kao--trad--wide';
      btn.setAttribute('data-trad', '1');
    }
    // data-mood 供 CSS 挂钩（配色/未来统计），同时保留无障碍名称
    btn.setAttribute('data-mood', item.mood);
    // data-id 对应分片里的稳定 ID：便于自动化测试逐条核对渲染结果
    btn.setAttribute('data-id', item.id);
    btn.setAttribute('aria-label', '复制颜文字 ' + item.rows.join(' '));

    var text = document.createElement('span');
    text.className = 'kao__text';
    var sym = needsSymStack(plainDisplay(item));
    if (sym) text.className += ' kao__text--sym';
    if (isTrad) text.className += ' kao__text--trad';
    // 双行或偏宽的条目降一档字号
    if (item.rows.length > 1 || item.w > 18) text.className += ' kao__text--sm';
    text.textContent = plainDisplay(item);

    var hint = document.createElement('span');
    hint.className = 'kao__copy';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'COPY';

    var meta = document.createElement('span');
    meta.className = 'kao__meta';
    meta.setAttribute('aria-hidden', 'true');
    meta.textContent = item.moodLabel || REVERSE_MOOD[item.mood] || item.mood;

    btn.appendChild(hint);
    btn.appendChild(text);
    btn.appendChild(meta);

    btn.addEventListener('click', function () { handleCopy(item, btn); });
    return btn;
  }

  /**
   * 大型颜文字：格子宽度的判定（本次改版的核心之一）。
   *
   * 旧做法是拿语料里的 `item.width`（**东亚宽度模型**：CJK/全角算 2 格、
   * 组合符号算 0）跟一个写死的阈值比：`width >= 28` 就独占整行。
   * 那个模型和本站实际用的比例字体栈对不上 —— 契约里早就记着这句话：
   * 「字符不是等宽的，在标准字符设计中，字符也不是等宽的」。
   * 实测同一批作品在 --ff-art 下的自然宽度与格数模型能差 20% 以上，
   * 于是出现了两种都难看的情况：
   *   · 模型说窄、实际很宽 → 挤在一列里被压到 7px 下限，小到看不清；
   *   · 模型说宽、实际很窄 → 白占一整行，左右空出一大片。
   *
   * 现在的判定改成**按实测自然宽度反推要占几列**：把每条作品在图外以
   * 16px 量出自然宽 w0、自然高 h0（与语料无关，完全取决于当前字体栈），
   * 再看「要几列才装得下」。
   *
   * 关键取舍：**列数是按宽度定的，字号是宽度定的，高度只做上限保护。**
   * 早期版本把「可用高度」也当成硬约束（拿一个 150px 的固定下限反推），
   * 结果是高瘦作品（例如 49×12 的袋鼠）被高度卡死 —— 字越小越矮、越矮越
   * 确认小，直接掉到 7px 下限，肉眼几乎看不清，而它的宽度其实只用到半列。
   * 高度本来就是由内容撑出来的，不该反过来决定字号（这是那条反馈环的老坑，
   * 只是以前发生在旧的字号自适应函数里，换个位置又冒出来一次）。
   *
   * 所以现在：
   *   · 先算「按宽度能给到的字号」byW，它是唯一的字号来源；
   *   · 再用「卡片高度上限」封顶（ART_MAX_STAGE_H，防止一幅画把一屏撑满）；
   *   · 跨列数按 byW 是否达到可读门槛决定，达到就停，不再继续加宽。
   */
  var FIT_MAX = 26;      // px，单列卡片字号上限
  var FIT_MAX_WIDE = 34; // px，跨列卡片字号上限（宽卡可以更大更清楚）
  /* 字号下限 = 可读门槛。早期这里是 7px，理由是「宁可让用户横向滚动」，
     但 7px 本身已经不可读 —— 手机上只有一列时，65 格宽的作品必然掉到这个
     下限，实测 7.13px，等于把「看不清」当成了兜底。现在统一取 9px：
     排不下就横向滚动（.art__stage 本来就是 overflow:auto），
     先保证看得清，再谈「不滚动」。 */
  var FIT_MIN = 9;
  /* 可读门槛：跨到第几列才「够看」。9px 是实测出来的 —— 再小，点阵画里的
     笔画与间隙就糊成一片，而放大一列立刻可辨。 */
  var ART_MIN_LEGIBLE = 9;
  /* 卡片高度上限（含标题栏）：一幅特别高的画不该独占一屏。
     超过时按高度反推一个更小的字号，这是**上限保护**，不是字号来源。 */
  var ART_MAX_STAGE_H = 460;   // px，舞台区高度上限

  /* 自然尺寸的量具：一个图外的 <pre>，与真卡片共用 --ff-art / --ff-sym，
     只用 inline font-size 固定到 16px（inline 会盖掉 640px 媒体查询里的
     字号上限，否则手机上量出来的基准是 9px，会系统性算小）。 */
  var measureHost = null;
  var measurePre = null;
  var artNatural = {};  // id -> {w, h}，字体确定后一次量好，重排不再重复量

  function ensureMeasure() {
    if (measurePre) return measurePre;
    measureHost = document.createElement('div');
    measureHost.setAttribute('aria-hidden', 'true');
    measureHost.style.cssText =
      'position:absolute;left:-9999px;top:0;width:9999px;height:0;overflow:hidden;visibility:hidden';
    measurePre = document.createElement('pre');
    measurePre.className = 'art__text';
    measureHost.appendChild(measurePre);
    document.body.appendChild(measureHost);
    return measurePre;
  }

  function measureArtNatural(item) {
    var cached = artNatural[item.id];
    if (cached) return cached;
    var pre = ensureMeasure();
    var sym = needsSymStack(plainDisplay(item));
    pre.className = 'art__text' + (sym ? ' art__text--sym' : '');
    pre.style.fontSize = '16px';
    pre.style.width = 'max-content';
    pre.textContent = plainDisplay(item);
    var r = pre.getBoundingClientRect();
    var out = { w: r.width, h: r.height };
    pre.textContent = '';
    if (out.w > 0 && out.h > 0) artNatural[item.id] = out;
    return out;
  }

  /* 卡片内可用于排字的宽度：卡宽 − 卡片左右描边 − 舞台左右内边距。
     这些值从 CSS 读一次（不写死，改样式就跟着变）。 */
  var stagePad = null;
  function stagePadding() {
    if (stagePad) return stagePad;
    var probe = document.createElement('div');
    probe.className = 'art__stage';
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:200px;visibility:hidden';
    document.body.appendChild(probe);
    var ps = getComputedStyle(probe);
    stagePad = {
      padX: parseFloat(ps.paddingLeft) + parseFloat(ps.paddingRight),
      padY: parseFloat(ps.paddingTop) + parseFloat(ps.paddingBottom),
    };
    document.body.removeChild(probe);
    return stagePad;
  }

  function stageBorderX() { return 2; }  // .art 的左右各 1px 描边

  /**
   * 一条大型作品该占几列、字号多大。
   * @param {object} item 语料条目
   * @param {{cols:number,colW:number,gap:number}} g 当前网格实测参数
   * @returns {{span:number,size:number}}
   */
  function planArtCard(item, g) {
    var nat = measureArtNatural(item);
    var pad = stagePadding();
    var border = stageBorderX();
    if (!nat || !nat.w) return { span: 1, size: FIT_MAX };

    /* 高度上限对应的字号：高作品也不许把一屏撑满。
       availH 是「舞台允许的最大高度」，由内容撑出，所以这里是纯上限。 */
    var maxH = ART_MAX_STAGE_H - pad.padY;
    var byH = maxH > 0 ? 16 * (maxH / nat.h) : FIT_MAX_WIDE;
    var hCap = Math.min(byH, FIT_MAX_WIDE);

    var span = 1;
    var size = FIT_MIN;
    for (var k = 1; k <= g.cols; k++) {
      var cardW = k * g.colW + (k - 1) * g.gap;
      var innerW = cardW - border - pad.padX;
      if (innerW <= 0) continue;
      var byW = 16 * (innerW / nat.w);
      var cap = k >= 2 ? FIT_MAX_WIDE : FIT_MAX;
      size = Math.min(byW, cap, hCap);
      span = k;
      /* 达到可读门槛就停：再宽只会让这张卡更占地方，不会更清楚。 */
      if (size >= ART_MIN_LEGIBLE) break;
    }
    if (size < FIT_MIN) size = FIT_MIN;
    size = Math.min(size, FIT_MAX_WIDE);
    return { span: span, size: size };
  }

  function renderLargeCard(item, plan) {
    plan = plan || { span: 1, size: FIT_MAX };
    var card = document.createElement('article');
    card.className = 'art';
    /* 跨列由 plan（实测自然宽度）决定，不再用 item.width 那个东亚格数模型。
       这里**不写 grid-column**：最终落点由 renderSection() 里的 packGrid
       统一写成 grid-row / grid-column（那一处才是唯一的真值来源）。
       早期在这里先写一次 `span N`、后面再被覆盖，等于同一件事两处赋值，
       一旦两边的 span 算法不等（曾经就是这样）第 5 行就会缺一块。
       .art--wide 现在只是语义标记（测试与样式钩子用），不带定位规则。 */
    if (plan.span > 1) card.className += ' art--wide';
    card.setAttribute('data-mood', item.mood);
    card.setAttribute('data-id', item.id);

    var stage = document.createElement('div');
    stage.className = 'art__stage';
    stage.setAttribute('role', 'button');
    stage.setAttribute('tabindex', '0');
    stage.setAttribute('aria-label', '复制大型颜文字「' + item.title + '」');

    var pre = buildArtText(item, needsSymStack(plainDisplay(item)));
    pre.style.setProperty('--fit', plan.size.toFixed(2) + 'px');

    stage.appendChild(pre);

    var bar = document.createElement('div');
    bar.className = 'art__bar';

    var title = document.createElement('span');
    title.className = 'art__title';
    title.textContent = item.title;

    var dims = document.createElement('span');
    dims.className = 'art__dims';
    dims.textContent = item.width + '×' + item.height;

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'art__copy';
    copyBtn.textContent = '复制';

    bar.appendChild(title);
    bar.appendChild(dims);
    bar.appendChild(copyBtn);
    card.appendChild(stage);
    card.appendChild(bar);

    function doCopy() { handleCopy(item, card); }
    stage.addEventListener('click', doCopy);
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doCopy(); }
    });
    copyBtn.addEventListener('click', doCopy);
    return card;
  }

  // ---------------------------------------------------------------- 筛选
  var state = { view: 'all', mood: null, q: '', tag: null, tagDim: null };

  /* --------------------------------------------------------------- 检索层
   *
   * 需求（产品原话）：支持标签搜索（如「开心」「伤心」）与模糊匹配（搜 >_< 出 （>_<））。
   *
   * 实现分三层，权重与 build/kaomoji-db.mjs 的 search() 严格一致：
   *   1. 字面子串  —— 检索键里能找到查询串就算命中（最可信，900/880）
   *   2. 骨架子串  —— 把嘴/眼填充字符折成 ? 再比，于是 >_< 也能命中 (>ω<)、(>﹏<)
   *   3. 语义      —— 同义词 → 标签（伤心→难过）、情绪名、标题包含
   *
   * 为什么要在浏览器里跑第二套实现：站点是纯静态的，浏览器里没有 SQLite
   * （WASM 版数 MB，破坏零依赖与首屏预算；后端在手机上且离线）。
   * 所以构建期用数据库做权威校验，同时把检索键、骨架键、同义词表、填充字符表
   * 全量导出；构建期会逐条比对两边结果，只要不一致就直接构建失败。
   * 换句话说：这里是「同一个算法的第二个宿主」，不是「另一个算法」。
   */
  var META = DATA.meta || {};
  var KEYS = META.keys || {};
  var SKELS = META.skels || {};
  var ALIASES = META.aliases || {};
  var FILLERS = {};
  (META.fillers || []).forEach(function (c) { FILLERS[c] = 1; });

  // 检索要遍历两栏的全体条目，先拼好
  var ALL = GENERAL.concat(LARGE);

  /* ------------------------------------------------------------ 分片补载
   *
   * 为什么要有这一段（完整背景见 docs/文字颜-数据形态决策.md 第 2、4 节）：
   *   语料要大量扩容，而整包 data.js 的体积随条目数线性涨
   *   （实测 5 万条约 1.7 MiB brotli）。检索本身不是瓶颈（5 万条 4.5ms），
   *   所以没必要「运行时查库」，只要「别在第一屏把全部数据搬过来」。
   *   于是构建期把数据切成 boot（首屏必需）+ index（检索键）+ 若干 rest 分片。
   *
   * 关键约束（改这段前必看）：
   *   1. **WZY_DATA 的结构不能变**。页面各处（以及 139 项 E2E）读的是
   *      DATA.general / DATA.large / DATA.meta.counts，这里补载完成后把
   *      数组就地拼齐全，上层代码完全感知不到「曾经缺过」。
   *   2. **counts 是构建期全量值**，不是「当前已到条数」。否则页面会显示
   *      「收录 60 条」，而真实是 1907 条。
   *   3. **就绪信号** DATA.ready：全部补载完成后置 true 并触发一次事件。
   *      E2E 与「展开/筛选」这类依赖全量的交互都靠它，不能靠 setTimeout 猜。
   *      首屏用 boot 渲染一次（用户立刻看到内容），补齐后再渲染一次。
   */
  var SHARD_MANIFEST = 'shards/manifest.json';
  var shardState = { started: false, done: false, failed: false };

  /** 一个极小的分片加载器：把若干同源 JS 分片 load 进来。
   *  为什么用 <script> 而不是 fetch：
   *   分片就是 JS 文件（window.WZY_SHARD = {...}），用 script 标签最省事，
   *    也天然走浏览器的静态资源缓存；fetch 还要自己 eval，多一层破坏面。
   *
   *  为什么并行加载、但合并仍然有序：
   *   原来这里是**串行**的（一个加载完再下一个）。串行在 1907 条时没问题
   *   （6 个分片），但语料扩到 5280 条后分片变成 14 个，实测线上补载
   *   要 **13.1 秒**（14 个请求串行，每个 0.5–1.8s）。用户看到的是
   *   「点展开要等十几秒」，首屏之后一直有卡顿。
   *   改成并行发起后，14 个请求同时在网络上跑，总耗时 ≈ 最慢那一个
   *   （实测约 1.8s），比串行快一个数量级。
   *
   *   并行会带来「完成顺序不确定」的问题 —— 而顺序会影响数组拼接顺序，
   *   进而影响渲染顺序与 E2E 核对。解决办法是**按名字把数据攒起来，
   *   最后按 manifest 给的原始顺序合并**（见 mergeShard 的调用处）：
   *   下载并发，数据有序，结果可复现。 */
  function loadShards(names, onDone, onFail) {
    if (!names.length) { onDone(); return; }
    var loaded = new Array(names.length);
    var remaining = names.length;
    var failed = false;

    function settle(i, name) {
      if (failed) return;
      remaining--;
      if (remaining <= 0) {
        if (failed) onFail(name); else onDone(loaded);
      }
    }

    names.forEach(function (name, i) {
      var s = document.createElement('script');
      s.src = 'shards/' + name + '.js';
      // 分片脚本本体是 `window.WZY_SHARD = {...}`，load 事件时它已经在全局了。
      // 必须先把数据存下来，再清掉全局变量 —— 反过来的话
      // 这一块的数据就丢了（脚本不会重跑）。
      s.onload = function () {
        loaded[i] = window.WZY_SHARD;
        window.WZY_SHARD = null;
        settle(i, name);
      };
      s.onerror = function () {
        failed = true;
        settle(i, name);
      };
      document.head.appendChild(s);
    });
  }

  /**
   * 补齐全量数据。
   * 幂等：重复调用只会跑一次。
   */
  function loadRemaining(done) {
    if (shardState.done && done) { done(); return; }
    if (shardState.started) { return; }
    shardState.started = true;
    shardState.failed = false;

    // manifest 里带着 pages 列表；这里用 fetch 取 JSON（同源、静态）
    window.fetch ? null : null;
    var req = new XMLHttpRequest();
    req.open('GET', SHARD_MANIFEST, true);
    req.onload = function () {
      var m;
      try {
        m = JSON.parse(req.responseText);
      } catch (e) {
        shardState.failed = true;
        if (done) done();
        return;
      }
      var names = (m.pages || []).map(function (p) { return p.name; });
      loadShards(names, function (loaded) {
        // 分片是并行下载的，完成顺序不确定 —— 但**合并顺序必须确定**，
        // 否则数组顺序会随网络快慢抖动，渲染顺序与 E2E 核对都不可复现。
        // loaded[i] 对应 names[i]，按索引顺序合并即可。
        (loaded || []).forEach(function (sh) { mergeShard(sh); });
        shardState.done = true;
        // 补齐后必须重建两类筛选 UI，否则它们停留在「只统计 boot 那几十条」的状态：
        //   1) 标签：recountTags 重算计数，buildTags 重建面板
        //      —— 不重算的话 renderTags 会用 `if (!TAG_COUNTS[t]) return`
        //      把 boot 里没出现过的标签整条过滤掉（「猫」就点不到）。
        //   2) 情绪：buildMoods 重建，让各情绪计数变成真实全量值。
        // 注意：这两个 build* 现在**不再绑事件**（事件在 wireMoodEvents /
        // wireTagEvents 里只绑一次），所以重复调用不会叠加监听器。
        recountTags();
        buildTags();
        buildMoods();
        if (done) done();
        DATA.ready = true;
        try { document.dispatchEvent(new CustomEvent('wzy-ready')); } catch (e) {}
        // 补齐后重渲染一次：首屏只画了 boot 那几十条，现在才是全量
        render();
      }, function (bad) {
        shardState.failed = true;
        if (done) done();
      });
    };
    req.onerror = function () {
      shardState.failed = true;
      if (done) done();
    };
    req.send();
  }

  /** 把一块分片并进 WZY_DATA。按顺序 append，保持构建期的排列。
   *  去重是防御：分片重复加载（比如重试）时不能产生重复卡片。 */
  function mergeShard(sh) {
    if (!sh) return;
    var g = sh.general || [];
    var l = sh.large || [];
    if (g.length) GENERAL.push.apply(GENERAL, g);
    if (l.length) LARGE.push.apply(LARGE, l);
    ALL = GENERAL.concat(LARGE);
  }

  /* ------------------------------------------------------------ 按需触发
   *
   * 分片有两种触发时机，都不是「一进页面就全拉」：
   *   1) 用户点「查看更多」或展开某区 → 需要该区全量；
   *   2) 用户开始搜索 → 需要检索索引（index 分片）。
   *
   * 为什么不做「进页面就后台拉完」：分片会削弱压缩（每文件单独 brotli），
   * 实测 1907 条时全量分片合计 88 KiB > 整包 77 KiB。
   * 只有「大多数访客只刷首屏、不搜索不展开」这个前提成立时分片才划算 ——
   * 而这里恰恰成立（首屏 5 KiB vs 77 KiB）。
   */
  var pending = [];

  /** 确保全量数据已到齐；未到齐时先把回调登记上，到齐后统一执行。 */
  function ensureFull(cb) {
    if (!NEEDS_MORE || shardState.done) { if (cb) cb(); return; }
    if (cb) pending.push(cb);
    loadRemaining(function () {
      var fns = pending.slice();
      pending = [];
      for (var i = 0; i < fns.length; i++) {
        try { fns[i](); } catch (e) {}
      }
    });
  }

  /** 确保检索索引到位。索引单独一个分片，只有搜索时才拉。 */
  var indexState = { started: false, done: false };
  function ensureIndex(cb) {
    // 已加载完：立刻回调（不能只 return —— 那样调用方的 render 永远不会触发）
    if (!NEEDS_MORE || indexState.done) { if (cb) cb(); return; }
    // 正在加载中：把回调排队，加载完统一执行。
    // 早期这里写的是「return，不保存 cb」—— 于是「首屏输入时 ensureFull 与
    // ensureIndex 并发」这种最常见的路径上，排队的调用方永远等不到回调，
    // 页面就停在「无结果」。必须排队。
    if (indexState.started) {
      if (cb) indexState.cbs.push(cb);
      return;
    }
    indexState.started = true;
    indexState.cbs = cb ? [cb] : [];
    var s = document.createElement('script');
    s.src = 'shards/index.js';
    s.onload = function () {
      var idx = window.WZY_INDEX;
      if (idx && idx.meta) {
        KEYS = idx.meta.keys || {};
        SKELS = idx.meta.skels || {};
        META.keys = KEYS;
        META.skels = SKELS;
      }
      window.WZY_INDEX = null;
      indexState.done = true;
      /* 关键：索引到位后必须**清掉检索缓存**。
         hitCache 按查询串缓存结果，若首次搜索发生在索引加载完成之前，
         缓存里存的是「用空索引算出的空结果」，而 q 没变 → 后续 render
         一直命中这个空缓存，表现为「明明有数据却搜不到」。
         实测就是 >_< 搜不到（DB 里 24 条、keys 里也有），而 猫 能搜到 ——
         差别只在索引是否恰好先加载完，是个竞态。 */
      hitCache.q = null;
      hitCache.map = null;
      var cbs = indexState.cbs || [];
      indexState.cbs = [];
      for (var i = 0; i < cbs.length; i++) { try { cbs[i](); } catch (e) {} }
    };
    s.onerror = function () { indexState.done = true; if (cb) cb(); };
    document.head.appendChild(s);
  }


  /** 与构建期 searchKey 同源：NFKC 折全角 → 小写 → 去零宽 → 去空白 */
  function searchKey(s) {
    var t = String(s);
    if (t.normalize) t = t.normalize('NFKC');
    return t
      .toLowerCase()
      .replace(/[\u200b\ufeff]/g, '')
      .replace(/[\s\u3000]+/g, '');
  }

  /** 与构建期 skeletonKey 同源：填充字符折成 ?，连续折叠成一个 */
  function skeletonKey(s) {
    var k = searchKey(s);
    var out = '';
    for (var i = 0; i < k.length; i++) {
      out += FILLERS[k.codePointAt(i)] ? '?' : k[i];
    }
    return out.replace(/\?+/g, '?');
  }

  /** 查询串是否全是填充字符（那样骨架退化成单 ?，太宽，弃用骨架层） */
  function isAllFiller(s) {
    var k = searchKey(s);
    if (!k) return false;
    for (var i = 0; i < k.length; i++) if (!FILLERS[k.codePointAt(i)]) return false;
    return true;
  }

  /*
   * tier 降权系数（用户要求 m00583「点阵画权重低、图画类颜文字权重低」
   * + 2026-11-02「有身体/在做动作的角色造型画排最上面，单纯的字符画降低权重」）。
   *
   * 与构建期 build/kaomoji-db.mjs 的 TIER_WEIGHTS 完全一致 —— 两处必须同值，
   * 否则浏览器端检索顺序会和构建期不一致。
   *
   *   figure  100  角色动作造型画：有五官且有身体/肢体/道具，用户要求置顶，不降权
   *   facey    85  只有头/胸像的表情造型：仍是「表情」，但视觉层次低于 figure
   *   picture  70  字符图片类：风景、器物、纹样、纯字符画，往下沉
   *   pixel    45  盲文点阵画：固定占满整行，视觉重量最大，沉得最狠
   *
   * 没标 tier 的一般条目按满分算。
   */
  var TIER_WEIGHTS = { figure: 100, facey: 85, picture: 70, pixel: 45 };

  function tierWeight(tier) {
    var w = TIER_WEIGHTS[tier];
    return typeof w === 'number' ? w : 100;
  }

  /**
   * 跑一次检索，返回 id → 命中信息。
   * 与构建期 runtimeSearch()（build/kaomoji-db.mjs）逐行对应。
   */
  function searchIds(query) {
    var q = searchKey(query);
    var out = new Map();
    if (!q) return out;

    var canon = ALIASES[q] || q;
    var skel = skeletonKey(query);
    var useSkel = !isAllFiller(query) && skel.length >= 3 && skel.indexOf('?') !== -1;

    var terms = [q];
    if (canon && canon !== q) terms.push(canon);

    // tier 降权：点阵画与字符图片类的命中分打折（用户要求 m00583）。
    // 系数与构建期完全一致（build/kaomoji-db.mjs 的 TIER_WEIGHTS）：
    // figure 100 / facey 85 / picture 70 / pixel 45。
    // 权重对同一条是常数，所以「取各层最高分」和「每层都打折」等价 ——
    // 在 bump 里直接打折即可，不必先收集最高分再乘。
    // 没标 tier 的一般条目按满分算（tierWeight 找不到就返回 100）。
    function bump(id, score, tier) {
      var w = tierWeight(tier);
      var weighted = Math.round((score * w) / 100);
      var cur = out.get(id);
      if (!cur || weighted > cur.score) out.set(id, { score: weighted });
    }

    var i, j, t, item, key, sk, tk;
    for (i = 0; i < ALL.length; i++) {
      item = ALL[i];
      key = KEYS[item.id] || '';
      // 1) 字面子串
      for (j = 0; j < terms.length; j++) {
        t = terms[j];
        if (key.indexOf(t) !== -1) bump(item.id, t.length >= 3 ? 900 : 880, item.tier);
      }
      // 2) 骨架子串
      if (useSkel) {
        sk = SKELS[item.id] || '';
        if (sk.indexOf(skel) !== -1) bump(item.id, 760, item.tier);
      }
      // 3) 语义
      if (item.tags && item.tags.indexOf(canon) !== -1) bump(item.id, 700, item.tier);
      if (item.moodLabel && searchKey(item.moodLabel) === canon) bump(item.id, 650, item.tier);
      if (item.title) {
        tk = searchKey(item.title);
        for (j = 0; j < terms.length; j++) {
          if (tk.indexOf(terms[j]) !== -1) bump(item.id, 800, item.tier);
        }
      }
    }
    return out;
  }

  var hitCache = { q: null, map: null };

  function hits() {
    if (hitCache.q !== state.q) {
      hitCache.q = state.q;
      hitCache.map = state.q ? searchIds(state.q) : null;
    }
    return hitCache.map;
  }

  function matches(item, isLarge) {
    // 四个视图的语义（data-view）：all / traditional / general / large
    //   · traditional —— 只要传统条目（it.trad）
    //   · general     —— 「一般」= 非传统的一般条目，语义上把传统分出去
    //   · large       —— 只要大型
    // 传统条目在数据上仍属 general（计数也计入 general），只是在视图里独立。
    if (state.view === 'traditional' && !(isLarge === false && item.trad === true)) return false;
    if (state.view === 'general' && (isLarge || item.trad === true)) return false;
    if (state.view === 'large' && !isLarge) return false;
    if (state.mood && item.mood !== state.mood) return false;
    if (state.tag && (item.tags || []).indexOf(state.tag) === -1) return false;
    if (!state.q) return true;
    var m = hits();
    return !!(m && m.has(item.id));
  }

  /* ------------------------------------------------------------ 分区与分页
   *
   * 需求（用户原话）：每个分区只显示 5 行，要查看更多必须点「更多」。
   *
   * 为什么是「5 行」而不是「5 条」或「50 条」：网格列数随视口变化
   * （桌面一般区 5 列、手机 2 列；传统区 9 / 3；大型区 3 / 1），
   * 写死条数会让「5 行」在别的视口上变成 12 行或 3 行。所以限制按**行**定义。
   *
   * 而「5 行」折成几条，又不能简单用 行数 × 列数：传统区有跨两列的长表情、
   * 大型区跨度逐条按实测宽度算，都占格位但不都贡献行高。所以实际做法是
   * 用 packGrid() 做一次 first-fit 排布模拟，返回「刚好落在前 5 行内」的
   * 条数 —— 同时也把每张卡的落点算出来了（见 packGrid 的注释）。
   *
   * 三区的展开状态各自独立：点开一般区不影响传统区。
   */
  var ROW_LIMIT = 5;

  /** 读一个网格当前的真实列数与列宽（CSS 里的 auto-fill 由浏览器算，不写死）。 */
  function gridMetrics(grid) {
    if (!grid) return null;
    var cs = getComputedStyle(grid);
    var tracks = cs.gridTemplateColumns ? cs.gridTemplateColumns.split(' ') : [];
    var cols = tracks.length;
    if (!cols) return null;
    return {
      cols: cols,
      colW: parseFloat(tracks[0]) || 0,
      gap: parseFloat(cs.columnGap) || 0,
    };
  }

  /**
   * 按 dense 语义做一次真实排布，返回每条卡的落点。
   *
   * 为什么要在 JS 里自己算，而不是交给 CSS 的 `grid-auto-flow: dense`：
   * CSS 的 dense 只在「当前光标之后」回填，一旦某行剩的洞比下一张跨列卡窄，
   * 那个洞就永久空着 —— 实测传统区展开后 48 行里有 9 行右侧空一整列。
   * 而我们本来就为了决定「显示多少条才铺满 5 行」在模拟排布，同一份结果
   * 顺手就能直接写成 grid-row / grid-column，让「填满」从**期望**变成**事实**。
   *
   * 算法：每条卡从第 0 行开始找第一个放得下它的位置（first-fit）。
   * 于是小卡会自动回填前面大卡留下的洞，只有「后续所有卡都填不进去」的
   * 洞才会留下 —— 那通常只在整块内容的最后一行出现。
   *
   * @param {Array<number>} spans 每条卡占几列
   * @param {number} cols 列数
   * @param {number} maxRows 最多铺到第几行（Infinity = 不限）
   * @returns {Array<{row:number,col:number,span:number}>} 每条卡的位置；
   *          超出 maxRows 的条目不会被包含（即「不该显示」的那些）
   */
  function packGrid(spans, cols, maxRows) {
    if (!cols) return [];
    var rows = [];           // 每行已占用的格位
    var placed = [];
    for (var i = 0; i < spans.length; i++) {
      var span = Math.min(spans[i] || 1, cols);
      var slot = -1, row = -1;
      for (var r = 0; r < maxRows && slot < 0; r++) {
        var used = rows[r];
        if (used === undefined) used = rows[r] = [];
        for (var c = 0; c + span <= cols; c++) {
          var free = true;
          for (var k = 0; k < span; k++) if (used[c + k]) { free = false; break; }
          if (free) { slot = c; row = r; break; }
        }
      }
      if (slot < 0) break;   // 这张卡落不进限定的行数，后面的也不必再试
      for (var k2 = 0; k2 < span; k2++) rows[row][slot + k2] = 1;
      placed.push({ row: row, col: slot, span: span, index: i });
    }
    return placed;
  }

  /* 分页状态见上方 paged（与 moreEl 一起声明）：筛选/搜索后一律归位到 5 行，
     否则「筛选后还停在第 8 批」会让用户看到一屏残余结果，误以为筛选没生效。 */

  function resetPaging() {
    paged.general.expanded = false;
    paged.traditional.expanded = false;
    paged.large.expanded = false;
  }

  var lastFilterKey = null;

  /**
   * 渲染一列卡片到网格，并挂上「更多」行。
   * @param {string} key      general / traditional / large
   * @param {Array}  items    该区已命中的全部条目（已排好序）
   * @param {Element} grid    目标网格
   * @param {function} makeCard 条目 → DOM
   */
  function renderSection(key, items, grid, makeCard) {
    if (!grid) return;
    var st = paged[key];
    grid.textContent = '';

    var metrics = gridMetrics(grid);
    var plans = [];

    /* 每条卡要占几列，在渲染前先算好 —— 因为「显示多少条才刚好铺满 5 行」
       依赖这个跨度序列。大型走实测宽度判定，传统只有极少数长表情跨两列，
       一般卡一律单列。 */
    for (var p = 0; p < items.length; p++) {
      if (key === 'large') {
        plans.push(metrics ? planArtCard(items[p], metrics) : { span: 1, size: FIT_MAX });
      } else if (key === 'traditional') {
        plans.push({ span: items[p].w >= 12 ? 2 : 1 });
      } else {
        plans.push({ span: 1 });
      }
    }

    var spanArr = [];
    for (var q = 0; q < plans.length; q++) spanArr.push(plans[q].span);

    var cols = metrics ? metrics.cols : 1;
    var maxRows = st.expanded ? Infinity : ROW_LIMIT;

    /* 自己排布并写死落点：这样「每行填充满」是必然结果，而不是寄希望于
       CSS 的 dense 能回填（实测它填不满，见 packGrid 的注释）。 */
    var placed = packGrid(spanArr, cols, maxRows);
    /* 兜底：极端窄屏下第 5 行可能一张都放不下（全是跨列卡），
       至少要显示第一行的容量，别出现「一条都没有」。 */
    if (!placed.length && items.length) {
      placed = packGrid(spanArr.slice(0, Math.min(items.length, cols * ROW_LIMIT)), cols, Infinity);
    }

    var show = placed.length;

    var frag = document.createDocumentFragment();
    for (var i = 0; i < show; i++) {
      var pos = placed[i];
      var card = key === 'large' ? makeCard(items[pos.index], plans[pos.index]) : makeCard(items[pos.index]);
      /* 显式落点：行/列都从 1 开始计数。跨列卡的 span 也在这里落定，
         与 packGrid 用的是同一份 plan.span，两者不可能对不上。 */
      card.style.gridRow = String(pos.row + 1);
      card.style.gridColumn = (pos.col + 1) + ' / span ' + pos.span;
      frag.appendChild(card);
    }
    grid.appendChild(frag);

    // 「更多」行：还有没显示的就给一个按钮，全显示完了给一个「收起」
    renderMore(key, items.length, show, metrics);
  }

  function renderMore(key, total, shown, metrics) {
    var host = moreEl[key];
    if (!host) return;
    host.textContent = '';

    var st = paged[key];
    var rest = total - shown;

    if (!st.expanded) {
      if (rest <= 0) { host.hidden = true; return; }
      host.hidden = false;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'more__btn';
      btn.setAttribute('data-more', key);
      btn.textContent = '查看更多';

      var n = document.createElement('span');
      n.className = 'more__n';
      n.textContent = '还有 ' + rest + ' 条';
      btn.appendChild(n);

      btn.addEventListener('click', function () {
        st.expanded = true;
        // 展开是「要该区全量」的信号：boot 只有首页那几十条，
        // 不补载就展开只会看到几十张卡，E2E 的「展开后渲染全部」也会失败。
        ensureFull(function () { render(); });
        render();
        /* 展开后把视线带到这一区的第一行：用户点「更多」是想继续看，
           停在原地会让人以为没反应。这里用「滚回本区顶部」而不是
           scrollIntoView(block:nearest) —— 后者在收起时会尝试把整节塞进
           视口，长节塞不下就滚到节的顶部，与「回到 5 行整齐视图」的预期不符；
           而且它会让测试里首屏的悬停检查落在页面深处。 */
        var sec = document.getElementById(key === 'traditional' ? 'traditional' : key);
        if (sec) {
          var top = sec.getBoundingClientRect().top + (window.pageYOffset || 0);
          window.scrollTo({ top: Math.max(0, top - 12), behavior: 'auto' });
        }
      });
      host.appendChild(btn);
      return;
    }

    // 已展开：写成「收起」，方便回到 5 行的整洁视图
    host.hidden = false;
    var fold = document.createElement('button');
    fold.type = 'button';
    fold.className = 'more__btn more__btn--fold';
    fold.setAttribute('data-fold', key);
    fold.textContent = '收起';
    fold.addEventListener('click', function () {
      st.expanded = false;
      render();
      /* 收起时把视线放回本区顶部（而不是保持「第 8 批」的位置），
         否则页面会突然缩掉几屏，浏览器会把人停在一个陌生的位置。 */
      var sec = document.getElementById(key === 'traditional' ? 'traditional' : key);
      if (sec) {
        var top = sec.getBoundingClientRect().top + (window.pageYOffset || 0);
        window.scrollTo({ top: Math.max(0, top - 12), behavior: 'auto' });
      }
    });
    host.appendChild(fold);
  }

  function render() {
    var ts = [];
    var gs = [];
    var ls = [];
    var i;

    /* 筛选条件一变，三区的分页全部归位到 5 行。
       放在 render() 里统一处理，而不是在每个筛选入口各自调一遍 ——
       情绪 chip、标签、搜索、视图切换、重置有五个入口，逐个记得调用
       迟早会漏一个（漏掉的表现就是「点了筛选还是一屏残余结果」）。 */
    var filterKey = state.view + '|' + (state.mood || '') + '|' +
                    (state.tag || '') + '|' + state.q;
    if (filterKey !== lastFilterKey) {
      lastFilterKey = filterKey;
      resetPaging();
    }

    for (i = 0; i < GENERAL.length; i++) {
      var it = GENERAL[i];
      if (!matches(it, false)) continue;
      if (it.trad === true) ts.push(it); else gs.push(it);
    }
    for (i = 0; i < LARGE.length; i++) if (matches(LARGE[i], true)) ls.push(LARGE[i]);

    /*
     * 检索态：按命中分从高到低排（用户要求 m00583「点阵画权重低、图画类颜文字权重低」）。
     *
     * 没有搜索词时保持语料原序 —— 那个顺序就是构建期写死的稳定顺序，
     * 翻页、复制、URL 哈希都依赖它稳定。
     *
     * 有搜索词时必须换成按 score 排：score 才是「这条有多像用户要找的东西」的
     * 量化，tier 降权就落在 score 上。如果不排序，降权改了但结果顺序不变，
     * 用户看不出任何区别 —— 这条改动就白做了。
     *
     * sort 是稳定的，所以同分的条目仍保持语料原序，不会出现「每次刷新顺序都抖」。
     */
    var scoreOf = null;
    if (state.q) {
      var hitMap = hits();
      scoreOf = function (item) {
        var h = hitMap && hitMap.get(item.id);
        return h ? h.score : 0;
      };
      gs.sort(function (a, b) { return scoreOf(b) - scoreOf(a); });
      ts.sort(function (a, b) { return scoreOf(b) - scoreOf(a); });
    }

    // 大型区四段排序：角色动作造型画(figure) → 表情造型(facey) → 字符图片(picture)
    // → 盲文点阵像素画(pixel)。
    //
    // 用户要求（m00306 + 2026-11-02）：
    //   「表情在上，字符图片在下」
    //   「有身体/在做动作的角色造型画在最上面，各种单纯的字符画降低权重」
    //
    // 2026-11-02 从三级升为四级：原来的三级只分「有脸 / 没脸」，于是
    // 「火箭炮少女」「搬砖的猫」这类**有身体、有肢体、在做动作**的角色画
    // 和「猫脸、牛之一」这类只有头/胸像的造型挤在同一段。现在拆开：
    //   figure = 有五官 + 画幅明显高于一个头（有身体/肢体/道具）
    //   facey  = 只有头/胸像的表情造型
    //
    // 像素画（盲文点阵拼的文字画）再排在最后：它们固定占满整行，
    // 视觉重量远大于普通行画，混在开头会把后面的行画压住。
    //
    // 四个标记（figure / facey / pixel）与 tier 字符串都由构建期算好
    // （build/export-runtime.mjs），前端不猜字符含义。
    // sort 是稳定的，所以每一段内部都保持语料原有顺序。
    //
    // 检索态下这段排序是**次级**键：上面已经按 score 排过一遍，这里再排一次
    // 会把 score 的顺序完全打乱。所以检索态下改成「score 降序，同分再按四段」，
    // 非检索态才用纯四段排序。
    //
    // 向后兼容：老 payload 没有 figure 标记时 a.figure 为 undefined（falsy），
    // 于是 facey 仍落到 1、picture 落到 2，行为与三级时代一致 ——
    // 不会因为缺字段把 facey 误降到 picture 段。
    ls.sort(function (a, b) {
      if (state.q) {
        var sa = scoreOf(a);
        var sb = scoreOf(b);
        if (sa !== sb) return sb - sa;
      }
      var ra = a.pixel ? 3 : (a.figure ? 0 : (a.facey ? 1 : 2));
      var rb = b.pixel ? 3 : (b.figure ? 0 : (b.facey ? 1 : 2));
      return ra - rb;
    });

    // 一般 / 传统 / 大型，三区各自的 5 行 + 更多
    renderSection('general', gs, gridEl, renderGeneralCard);
    renderSection('traditional', ts, tradGridEl, renderGeneralCard);
    renderSection('large', ls, galleryEl, renderLargeCard);

    // 分节显隐
    if (sectionTraditional) sectionTraditional.hidden = ts.length === 0;
    sectionGeneral.hidden = gs.length === 0;
    sectionLarge.hidden = ls.length === 0;

    var total = ts.length + gs.length + ls.length;
    emptyEl.hidden = total !== 0;

    // 计数文案
    var parts = [];
    if (gs.length) parts.push(gs.length + ' 条一般');
    if (ts.length) parts.push(ts.length + ' 条传统');
    if (ls.length) parts.push(ls.length + ' 条大型');
    resultCountEl.textContent = total ? parts.join(' · ') : '无结果';

    // 节编号同步（筛选后仍显示全站编号，避免「§ 01」忽隐忽现）
    document.getElementById('generalNo').textContent = '§ 01 · ' + gs.length;
    var tradNo = document.getElementById('traditionalNo');
    if (tradNo) tradNo.textContent = '§ 02 · ' + ts.length;
    document.getElementById('largeNo').textContent = '§ 03 · ' + ls.length;

    // 同步 URL，便于分享筛选状态
    syncHash();
  }

  // ------------------------------------------------------------ 情绪 chips
  function buildMoods() {
    if (!moodsEl) return;
    var counts = {};
    GENERAL.concat(LARGE).forEach(function (it) {
      counts[it.mood] = (counts[it.mood] || 0) + 1;
    });

    moodsEl.textContent = '';

    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'chip';
    allBtn.setAttribute('data-mood', '');
    allBtn.setAttribute('aria-pressed', 'true');
    allBtn.textContent = '全部';
    var n = document.createElement('span');
    n.className = 'chip__n';
    /* 与顶栏 updateStats() 同一口径：分片模式下首屏只有 boot 那 110 条，
       GENERAL.length + LARGE.length 只是「当前已到条数」，不是全站收录量。
       counts 是构建期算好的全量值，所以这里优先用它（同 updateStats 的注释）。 */
    n.textContent = (META.counts && META.counts.total) || (GENERAL.length + LARGE.length);
    allBtn.appendChild(n);
    moodsEl.appendChild(allBtn);

    Object.keys(MOODS).forEach(function (key) {
      if (!counts[key]) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('data-mood', key);
      b.setAttribute('aria-pressed', 'false');
      b.textContent = MOODS[key];
      var c = document.createElement('span');
      c.className = 'chip__n';
      c.textContent = counts[key];
      b.appendChild(c);
      moodsEl.appendChild(b);
    });
  }

  /* 情绪 chip 的事件绑定：与标签同理，必须**只绑一次**。
   * 分片补载后要重建 chip（计数与条目都变了），若绑定留在 buildMoods() 内部，
   * 同一容器上会叠出重复监听器，点一次「开心」先选中再取消 = 点了没反应。 */
  function wireMoodEvents() {
    if (!moodsEl) return;
    moodsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip');
      if (!btn) return;
      var mood = btn.getAttribute('data-mood') || null;
      state.mood = state.mood === mood ? null : mood;
      // 「全部」永远不是切换态，点它就是清空
      if (!mood) state.mood = null;
      updateChips();
      // 按情绪筛的是「全站这个情绪的条目」：boot 只有各分区几十条，
      // 直接筛会得到严重残缺的结果。所以先补齐全量再渲染。
      if (mood) {
        ensureFull(function () { render(); });
      }
      render();
    });
  }

  function updateChips() {
    var chips = moodsEl.querySelectorAll('.chip');
    for (var i = 0; i < chips.length; i++) {
      var m = chips[i].getAttribute('data-mood') || null;
      chips[i].setAttribute('aria-pressed', m === state.mood ? 'true' : 'false');
    }
  }

  // ------------------------------------------------------------ 标签筛选
  /*
   * 情绪条只有 12 种，但数据库里是 61 个受控标签、分 6 个维度。
   * 「企鹅」「蝴蝶结」「晚安」「竖拇指」这类细粒度标签没法塞进情绪条，
   * 所以做成：先选维度，再选该维度下的词条。
   *
   * 标签来自 meta.tagsByDim（构建期从数据库的 tag 表按 dimension 分组导出），
   * 点击只是前端过滤，不发请求。
   */
  var TAGS_BY_DIM = (DATA.meta && DATA.meta.tagsByDim) || {};
  var TAG_DIMS = (DATA.meta && DATA.meta.tagDims) || {};
  var tagDimEl = document.getElementById('tagDims');
  var tagListEl = document.getElementById('tagList');
  var tagWrap = document.getElementById('tags');

  // 每个标签有多少条（用于词条上的计数，也顺手过滤掉空维度）
  var TAG_COUNTS = {};
  /** 重算标签计数。
   *
   * 为什么必须是函数而不是初始化时算一次：
   *   分片模式下，页面初始化时 ALL 里只有 boot 那几十条，
   *   此时算出来的 TAG_COUNTS 会让 renderTags 用 `if (!TAG_COUNTS[t]) return`
   *   把「猫」这类在 boot 里没出现过的标签**整条过滤掉** —— 结果就是
   *   标签面板里根本没有「猫」这个 chip，用户点不到（E2E 也会查不到）。
   *   所以补载完成后必须重算一次，再重建标签面板。 */
  function recountTags() {
    TAG_COUNTS = {};
    ALL.forEach(function (it) {
      (it.tags || []).forEach(function (t) {
        TAG_COUNTS[t] = (TAG_COUNTS[t] || 0) + 1;
      });
    });
  }

  function buildTags() {
    if (!tagDimEl || !tagListEl) return;

    var dims = Object.keys(TAGS_BY_DIM).filter(function (d) {
      return (TAGS_BY_DIM[d] || []).length > 0;
    });
    if (!dims.length) { tagWrap.hidden = true; return; }

    // 默认停在「动物」——最有辨识度、也最能说明「标签能一路细下去」。
    // 但 URL 里带了 td=（分享链接）时以 URL 为准，别覆盖用户的筛选态。
    if (!state.tagDim || dims.indexOf(state.tagDim) === -1) {
      state.tagDim = dims.indexOf('animal') !== -1 ? 'animal' : dims[0];
    }

    tagDimEl.textContent = '';
    dims.forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tagdim';
      b.setAttribute('data-dim', d);
      b.textContent = TAG_DIMS[d] || d;
      tagDimEl.appendChild(b);
    });

    renderTags();
  }

  /* ------------------------------------------------------------ 标签事件绑定
   *
   * 为什么把 addEventListener 从 buildTags() 里搬到这里（只绑一次）：
   *   buildTags() 原先会被调用一次，监听器绑在容器上（委托），所以没问题。
   *   但分片模式下补载完成需要**重建**标签面板（新标签要出现），
   *   buildTags() 会被调用第二次 —— 若绑定仍写在函数体内，同一个容器上
   *   就会叠出第二个监听器：用户点一次 chip，处理器执行两次，
   *   `state.tag = state.tag === t ? null : t` 先选中再取消，
   *   表现成「点了没反应」（E2E 抓到的是 tagProbe 两条记录、最终 now=null）。
   *   容器元素本身不重建，所以绑定搬到一次性初始化的地方是安全的。 */
  function wireTagEvents() {
    if (!tagDimEl || !tagListEl) return;

    tagDimEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.tagdim');
      if (!btn) return;
      state.tagDim = btn.getAttribute('data-dim');
      renderTags();
    });

    tagListEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.tagchip');
      if (!btn) return;
      var t = btn.getAttribute('data-tag') || null;
      state.tag = state.tag === t ? null : t;
      updateTags();
      // 同情绪筛选：按标签筛的也是全站范围，boot 的配额不够，
      // 不补载就会把「带猫标签」的条目漏掉大半（E2E 会逐条核对标签）。
      if (state.tag) {
        ensureFull(function () { render(); });
      }
      render();
    });
  }

  function renderTags() {
    var list = TAGS_BY_DIM[state.tagDim] || [];
    tagListEl.textContent = '';

    // 「不限」先给一个明确的出口，避免用户以为必须选一个标签
    var anyBtn = document.createElement('button');
    anyBtn.type = 'button';
    anyBtn.className = 'tagchip';
    anyBtn.setAttribute('data-tag', '');
    anyBtn.textContent = '不限';
    tagListEl.appendChild(anyBtn);

    list.forEach(function (t) {
      if (!TAG_COUNTS[t]) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tagchip';
      b.setAttribute('data-tag', t);
      b.textContent = t;
      var c = document.createElement('span');
      c.className = 'tagchip__n';
      c.textContent = TAG_COUNTS[t];
      b.appendChild(c);
      tagListEl.appendChild(b);
    });

    updateTags();
  }

  function updateTags() {
    if (!tagDimEl) return;
    var dims = tagDimEl.querySelectorAll('.tagdim');
    for (var i = 0; i < dims.length; i++) {
      dims[i].setAttribute('aria-pressed', dims[i].getAttribute('data-dim') === state.tagDim ? 'true' : 'false');
    }
    var chips = tagListEl.querySelectorAll('.tagchip');
    for (var j = 0; j < chips.length; j++) {
      chips[j].setAttribute('aria-pressed', ((chips[j].getAttribute('data-tag') || null) === state.tag) ? 'true' : 'false');
    }
  }

  // ------------------------------------------------------------ URL 状态
  function syncHash() {
    var p = [];
    if (state.mood) p.push('m=' + state.mood);
    if (state.view !== 'all') p.push('v=' + state.view);
    if (state.tag) p.push('t=' + encodeURIComponent(state.tag));
    if (state.tagDim) p.push('td=' + state.tagDim);
    if (state.q) p.push('q=' + encodeURIComponent(state.q));
    var h = p.length ? '#' + p.join('&') : '';
    if (h !== location.hash) {
      history.replaceState(null, '', location.pathname + location.search + h);
    }
  }

  function readHash() {
    var raw = (location.hash || '').replace(/^#/, '');
    if (!raw) return;
    raw.split('&').forEach(function (kv) {
      var idx = kv.indexOf('=');
      if (idx < 0) return;
      var k = kv.slice(0, idx);
      var v = kv.slice(idx + 1);
      if (k === 'm' && MOODS[v]) state.mood = v;
      if (k === 'v' && (v === 'all' || v === 'traditional' || v === 'general' || v === 'large')) state.view = v;
      if (k === 'td' && TAGS_BY_DIM[v]) state.tagDim = v;
      if (k === 't') { try { state.tag = decodeURIComponent(v); } catch (e) { state.tag = v; } }
      if (k === 'q') { try { state.q = decodeURIComponent(v); } catch (e) { state.q = v; } }
    });
  }

  // ------------------------------------------------------------ 顶部与工具条
  function wireControls() {
    var q = document.getElementById('q');
    var qClear = document.getElementById('qClear');
    var searchWrap = document.getElementById('searchWrap');
    var timer = 0;

    if (q) {
      if (state.q) q.value = state.q;
      searchWrap.setAttribute('data-filled', state.q ? '1' : '0');

      q.addEventListener('input', function () {
        searchWrap.setAttribute('data-filled', q.value ? '1' : '0');
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.q = q.value.trim();
          // 搜索需要两样东西：全量条目 + 检索索引（keys/skels 单独一片）。
          // 两者都到位才 render，否则会拿 boot 那几十条去匹配，结果严重不完整。
          if (state.q) {
            ensureFull(function () {
              ensureIndex(function () { render(); });
            });
          }
          render();
        }, 110);
      });
      q.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          q.value = '';
          state.q = '';
          searchWrap.setAttribute('data-filled', '0');
          render();
        }
      });
    }

    if (qClear) {
      qClear.addEventListener('click', function () {
        q.value = '';
        state.q = '';
        searchWrap.setAttribute('data-filled', '0');
        q.focus();
        render();
      });
    }

    var segBtns = document.querySelectorAll('.segmented button');
    for (var i = 0; i < segBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          state.view = btn.getAttribute('data-view');
          for (var j = 0; j < segBtns.length; j++) {
            segBtns[j].setAttribute('aria-pressed', segBtns[j] === btn ? 'true' : 'false');
          }
          render();
        });
      })(segBtns[i]);
    }

    // 从 URL 读到的 view 要回填到分段控件
    for (var k = 0; k < segBtns.length; k++) {
      segBtns[k].setAttribute('aria-pressed', segBtns[k].getAttribute('data-view') === state.view ? 'true' : 'false');
    }

    var resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        var keepDim = state.tagDim;
        state = { view: 'all', mood: null, q: '', tag: null, tagDim: keepDim };
        if (q) { q.value = ''; searchWrap.setAttribute('data-filled', '0'); }
        for (var j = 0; j < segBtns.length; j++) {
          segBtns[j].setAttribute('aria-pressed', segBtns[j].getAttribute('data-view') === 'all' ? 'true' : 'false');
        }
        updateChips();
        updateTags();
        render();
      });
    }
  }

  // ---------------------------------------------------------------- 启动
  // 首屏的大标题和统计药丸已按需求移除，现在唯一的统计出口是顶栏那一行。
  function updateStats() {
    /* 收录总数必须取**构建期全量**（META.counts.total），不能用
       GENERAL.length + LARGE.length —— 分片模式下后者在首屏只是 boot
       那 110 条，要等 loadRemaining 补齐才变成全量。以前这里直接数数组，
       于是顶栏在整次会话里一直显示「收录 110 条」，而真实是 4451 条。
       （app.js 上方 loadRemaining 的注释第 2 条就写明了 counts 是构建期
       全量值、不是「当前已到条数」，这里是同一个约束的另一处落点。）

       兜底：整包模式 / 老数据没有 counts 时退回数组长度，行为不变。 */
    var total = (META.counts && META.counts.total) || (GENERAL.length + LARGE.length);
    var elC = document.getElementById('mastheadCount');
    // 传统条目已经算在 GENERAL 里，所以总数不必再加一次
    if (elC) elC.textContent = '收录 ' + total + ' 条';
  }

  // ------------------------------------------------ 移动端下滑收起筛选（2026-11-02）
  /*
   * 用户要求：「移动端网页下滑时，只保留顶栏和搜索框（即所有筛选 tag 都随着
   * 下滑隐藏，包含『全部、传统、一般、大型』），和顶部动画区一致」。
   *
   * 口径（一条都不能少）：
   *   · 顶栏（.masthead，品牌 + 收录数）**始终留在 sticky 顶**；
   *   · 搜索框（迁移到 .toolbar 的搜索行）**始终可见、可聚焦**；
   *   · 收起的是三组筛选：.segmented（全部/传统/一般/大型）、.moods（情绪）、
   *     .tags（标签维度+词条），以及结果计数（它是筛选的反馈，跟着一起走）；
   *   · 顶部动画区（.hero）本来就不是 sticky，下滑时自然滚出视口 ——
   *     它不是被这段逻辑收起的，只是「一起消失」。
   *
   * 实现要点：
   *   1. 只改 .toolbar 的一个状态属性（data-collapsed="1"），CSS 据此收起子组；
   *      不给每个元素单独设 hidden —— 单一真值来源，恢复时不会漏。
   *   2. 只在移动端生效（matchMedia('(max-width: 820px)')）。桌面端行为完全不变。
   *   3. 双阈值迟滞（滚过 120 收起、回到 60 以内展开），避免边界抖动。
   *   4. 滚动监听用 { passive: true } + requestAnimationFrame 合并，
   *      不在 scroll 回调里直接改样式/触发布局。
   *   5. 收起态的子组会 display:none，可聚焦按钮随容器一起离开 tab 序
   *      （无障碍要求：键盘用户不会掉进看不见的控件）。
   *   6. prefers-reduced-motion 下不做过渡动画（CSS 侧处理），状态切换照旧。
   */
  function initMobileCollapse() {
    var toolbar = document.querySelector('.toolbar');
    if (!toolbar || !window.matchMedia) return;

    var mq = window.matchMedia('(max-width: 820px)');
    var COLLAPSE_AT = 120;   // 下滑超过这个像素就收起
    var RESTORE_AT = 60;     // 回到这个像素以内就展开（迟滞区间 60）
    var queued = false;
    var collapsed = false;

    function apply(next) {
      if (next === collapsed) return;
      collapsed = next;
      if (next) toolbar.setAttribute('data-collapsed', '1');
      else toolbar.removeAttribute('data-collapsed');
    }

    function evaluate() {
      queued = false;
      if (!mq.matches) {
        // 桌面端：一律展开，且不留状态属性（否则从窄屏转回宽屏会残留收起态）
        apply(false);
        return;
      }
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (!collapsed && y > COLLAPSE_AT) apply(true);
      else if (collapsed && y < RESTORE_AT) apply(false);
    }

    function onScroll() {
      if (queued) return;
      queued = true;
      if (window.requestAnimationFrame) window.requestAnimationFrame(evaluate);
      else evaluate();
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // 视口跨过 820px 断点时立刻归位（否则窄屏收起后转宽屏会留着收起态）
    if (mq.addEventListener) mq.addEventListener('change', evaluate);
    else if (mq.addListener) mq.addListener(evaluate);

    evaluate();
  }

  function init() {
    readHash();
    buildRiver();
    // 先算一次标签计数：整包模式下这就是最终值（不会再补载）；
    // 分片模式下后面补齐后还会重算一次（见 loadRemaining 的完成回调）。
    // 漏掉这一句会让整包模式的标签面板只剩「不限」一个按钮 —— 因为
    // renderTags 用 TAG_COUNTS 过滤空标签，而它当时是空对象。
    recountTags();
    buildMoods();
    buildTags();
    // 情绪 / 标签事件都只绑一次（委托到容器上）。分片补载后会重建面板，
    // 若绑定写在 build*() 里就会叠出重复监听器 —— 见 wireTagEvents 上方注释。
    wireMoodEvents();
    wireTagEvents();
    wireControls();
    updateStats();
    render();
    // 移动端下滑收起筛选（只改 .toolbar 的 data-collapsed，桌面端不受影响）
    initMobileCollapse();

    /* ---- 分片补载 ----
       首屏先用 boot 那几十条渲染（用户立刻看到内容，不用等网络），
       然后异步补齐剩余数据，补完再重渲染一次。
       为什么要「先渲染再补」而不是「等齐再渲染」：等齐等于把首屏
       押在一次网络往返上，那就退化成原来的整包加载了，分片白做。
       未分片（老的 data.js）时 NEEDS_MORE=false，这里什么都不发生。 */
    if (NEEDS_MORE) {
      loadRemaining();
    }

    /* 字体是异步解析的：首帧量出来的自然宽度可能不准（系统符号字体还没
       生效时会算窄），所以字体就绪后再清掉量得的缓存、重排一次。
       这也解释了为什么 artNatural 需要能整体失效。 */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        artNatural = {};
        render();
      });
    }
    window.addEventListener('resize', scheduleRerender);
    window.addEventListener('orientationchange', scheduleRerender);
    // 河的密度与字号取决于可用面积，视口变化时要按新尺寸重建
    window.addEventListener('resize', scheduleRiverRebuild);
    window.addEventListener('orientationchange', scheduleRiverRebuild);
  }

  /* 视口变化要重排：列数变了，「5 行」折成的条数、大型卡的跨列数与字号
     全都得跟着重算。合并同一帧内的多次请求，避免 resize 时反复重排。 */
  var rerenderQueued = false;
  function scheduleRerender() {
    if (rerenderQueued) return;
    rerenderQueued = true;
    requestAnimationFrame(function () {
      rerenderQueued = false;
      stagePad = null;                          // 内边距可能随媒体查询变化
      if (document.fonts && document.fonts.ready) artNatural = {};
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
