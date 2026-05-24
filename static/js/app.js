(function () {
  'use strict';

  var config = window.Config || {};
  var statusText = {
    ok: '正常',
    down: '无法访问',
    unknow: '未知',
  };

  function append(parent, child) {
    parent.appendChild(child);
    return child;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function link(to, text, className) {
    var node = el('a', className, text);
    node.href = to || '#';
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
    return node;
  }

  function formatNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) number = 0;
    return String(Math.floor(number * 100) / 100);
  }

  function formatDuration(seconds) {
    var s = parseInt(seconds, 10) || 0;
    var m = 0;
    var h = 0;
    if (s >= 60) {
      m = parseInt(s / 60, 10);
      s = parseInt(s % 60, 10);
      if (m >= 60) {
        h = parseInt(m / 60, 10);
        m = parseInt(m % 60, 10);
      }
    }
    var text = s + ' 秒';
    if (m > 0) text = m + ' 分 ' + text;
    if (h > 0) text = h + ' 小时 ' + text;
    return text;
  }

  function addDays(date, days) {
    var next = new Date(date.getTime());
    next.setDate(next.getDate() + days);
    return next;
  }

  function unix(date) {
    return Math.floor(date.getTime() / 1000);
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function formatDate(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function dateKey(date) {
    return '' + date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate());
  }

  function apiKeys() {
    if (Array.isArray(config.ApiKeys)) return config.ApiKeys.filter(Boolean);
    if (typeof config.ApiKeys === 'string' && config.ApiKeys) return [config.ApiKeys];
    return [];
  }

  function buildHeader(root) {
    var header = append(root, el('div', null));
    header.id = 'header';
    var container = append(header, el('div', 'container'));
    append(container, el('h1', 'logo', config.SiteName || 'Uptime Status'));
    var navi = append(container, el('div', 'navi'));
    (Array.isArray(config.Navi) ? config.Navi : []).forEach(function (item) {
      append(navi, link(item.url, item.text));
    });
  }

  function buildShell(root) {
    buildHeader(root);
    var container = append(root, el('div', 'container'));
    var uptime = append(container, el('div'));
    uptime.id = 'uptime';

    append(container, el('div')).id = 'footer';
    var footer = container.querySelector('#footer');
    var first = append(footer, el('p'));
    first.append('基于 ');
    append(first, link('https://uptimerobot.com/', 'UptimeRobot'));
    first.append(' 接口制作，检测频率 5 分钟');
    var second = append(footer, el('p'));
    second.append('© 2024 ');
    append(second, link('https://uptime.zrfme.com', '周润发'));
    second.append(', Version 2.0.0');

    return uptime;
  }

  function loadingSite() {
    var site = el('div', 'site');
    append(site, el('div', 'loading'));
    return site;
  }

  function messageSite(title, message) {
    var site = el('div', 'site');
    var meta = append(site, el('div', 'meta'));
    append(meta, el('span', 'name', title));
    append(meta, el('span', 'status unknow', statusText.unknow));
    var summary = append(site, el('div', 'summary'));
    append(summary, el('span', null, message));
    return site;
  }

  async function getMonitors(apikey, days) {
    var count = Math.max(1, parseInt(days, 10) || 60);
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var dates = [];
    for (var index = 0; index < count; index += 1) {
      dates.push(addDays(today, -index));
    }

    var ranges = dates.map(function (date) {
      return unix(date) + '_' + unix(addDays(date, 1));
    });
    var start = unix(dates[dates.length - 1]);
    var end = unix(addDays(dates[0], 1));
    ranges.push(start + '_' + end);

    var body = new URLSearchParams({
      api_key: apikey,
      format: 'json',
      logs: '1',
      log_types: '1-2',
      logs_start_date: String(start),
      logs_end_date: String(end),
      custom_uptime_ranges: ranges.join('-'),
    });

    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, 30000);

    try {
      var response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);

      var data = await response.json();
      if (data.stat !== 'ok') {
        var apiError = data.error && (data.error.message || data.error.type);
        throw new Error(apiError || 'UptimeRobot API 返回失败');
      }

      return (data.monitors || []).map(function (monitor) {
        var uptimeRanges = String(monitor.custom_uptime_ranges || '').split('-');
        var average = formatNumber(uptimeRanges.pop());
        var map = {};
        var daily = dates.map(function (date, index) {
          map[dateKey(date)] = index;
          return {
            date: date,
            uptime: Number(formatNumber(uptimeRanges[index])),
            down: { times: 0, duration: 0 },
          };
        });

        var total = { times: 0, duration: 0 };
        (Array.isArray(monitor.logs) ? monitor.logs : []).forEach(function (log) {
          if (log.type !== 1) return;
          var key = dateKey(new Date(log.datetime * 1000));
          var dailyIndex = map[key];
          total.duration += log.duration || 0;
          total.times += 1;
          if (dailyIndex === undefined) return;
          daily[dailyIndex].down.duration += log.duration || 0;
          daily[dailyIndex].down.times += 1;
        });

        var status = 'unknow';
        if (monitor.status === 2) status = 'ok';
        if (monitor.status === 9) status = 'down';

        return {
          id: monitor.id,
          name: monitor.friendly_name || monitor.url || 'Unnamed monitor',
          url: monitor.url,
          average: average,
          daily: daily,
          total: total,
          status: status,
        };
      });
    } finally {
      clearTimeout(timer);
    }
  }

  function renderSite(site) {
    var node = el('div', 'site');
    var meta = append(node, el('div', 'meta'));
    var name = append(meta, el('span', 'name'));
    name.innerHTML = site.name;
    if (config.ShowLink !== false && site.url) {
      append(meta, link(site.url, site.name, 'link'));
    }
    append(meta, el('span', 'status ' + site.status, statusText[site.status]));

    var timeline = append(node, el('div', 'timeline'));
    site.daily.slice().sort(function (a, b) {
      return a.date - b.date;
    }).forEach(function (data) {
      var state = '';
      var text = formatDate(data.date) + ' ';
      if (data.uptime >= 100) {
        state = 'ok';
        text += '可用率 ' + formatNumber(data.uptime) + '%';
      } else if (data.uptime <= 0 && data.down.times === 0) {
        state = 'none';
        text += '无数据';
      } else {
        state = 'down';
        text += '故障 ' + data.down.times + ' 次，累计 ' + formatDuration(data.down.duration) + '，可用率 ' + formatNumber(data.uptime) + '%';
      }
      var tick = append(timeline, el('i', state));
      tick.title = text;
      tick.setAttribute('aria-label', text);
    });

    var summary = append(node, el('div', 'summary'));
    append(summary, el('span', null, formatDate(site.daily[site.daily.length - 1].date)));
    append(summary, el(
      'span',
      null,
      site.total.times
        ? '最近 ' + (config.CountDays || 60) + ' 天故障 ' + site.total.times + ' 次，累计 ' + formatDuration(site.total.duration) + '，平均可用率 ' + site.average + '%'
        : '最近 ' + (config.CountDays || 60) + ' 天可用率 ' + site.average + '%'
    ));
    append(summary, el('span', null, '今天'));

    return node;
  }

  function renderMonitors(uptime, placeholder, key) {
    getMonitors(key, config.CountDays).then(function (monitors) {
      var nodes = monitors.length ? monitors.map(renderSite) : [messageSite('暂无监控项', 'UptimeRobot 没有返回监控数据')];
      placeholder.replaceWith.apply(placeholder, nodes);
    }).catch(function (error) {
      placeholder.replaceWith(messageSite('加载失败', error.message || '请检查 ApiKeys 或网络连接'));
    });
  }

  function start() {
    var root = document.getElementById('app');
    if (!root) return;
    document.title = config.SiteName || document.title;
    root.textContent = '';
    var uptime = buildShell(root);
    var keys = apiKeys();
    if (!keys.length) {
      append(uptime, messageSite('缺少 API Key', '请在 config.js 中配置 ApiKeys'));
      return;
    }
    keys.forEach(function (key) {
      var placeholder = append(uptime, loadingSite());
      renderMonitors(uptime, placeholder, key);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());
