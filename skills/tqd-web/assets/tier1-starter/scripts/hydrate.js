/* Cập nhật trang từ data/site-data.js ngay khi bấm đúp mở index.html trên máy (file://). */
document.addEventListener('DOMContentLoaded', function () {
  var data = window.SITE_DATA;

  if (!data) {
    var host = location.hostname;
    if (location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1') {
      var banner = document.createElement('div');
      banner.setAttribute('role', 'alert');
      banner.style.cssText = 'background:#fff3cd;color:#664d03;padding:12px 16px;font:16px/1.5 system-ui';
      banner.textContent = 'Tệp data/site-data.js đang có lỗi gõ nên trang hiện nội dung cũ. Hãy kiểm tra dấu ngoặc kép và dấu phẩy ở dòng vừa sửa, hoặc nhờ trợ lý AI kiểm tra tệp này.';
      document.body.insertBefore(banner, document.body.firstChild);
    }
    return;
  }

  function lookup(path) {
    var parts = path.split('.');
    var cur = data;
    for (var i = 0; i < parts.length; i += 1) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  var lists = document.querySelectorAll('[data-edit-list]');
  for (var l = 0; l < lists.length; l += 1) {
    var container = lists[l];
    var arr = lookup(container.getAttribute('data-edit-list'));
    if (!Array.isArray(arr) || arr.length === 0) continue;
    var items = container.querySelectorAll('[data-edit-item]');
    if (items.length === 0) continue;
    var tpl = items[0].cloneNode(true);
    for (var r = 0; r < items.length; r += 1) {
      items[r].parentNode.removeChild(items[r]);
    }
    for (var a = 0; a < arr.length; a += 1) {
      var node = tpl.cloneNode(true);
      var fields = node.querySelectorAll('[data-edit-field]');
      for (var f = 0; f < fields.length; f += 1) {
        var fieldVal = arr[a] == null ? undefined : arr[a][fields[f].getAttribute('data-edit-field')];
        fields[f].textContent = typeof fieldVal === 'string' ? fieldVal : '';
      }
      container.appendChild(node);
    }
  }

  var textNodes = document.querySelectorAll('[data-edit]');
  for (var i = 0; i < textNodes.length; i += 1) {
    var val = lookup(textNodes[i].getAttribute('data-edit'));
    if (typeof val === 'string') textNodes[i].textContent = val;
  }

  var telNodes = document.querySelectorAll('[data-edit-tel]');
  for (var j = 0; j < telNodes.length; j += 1) {
    var tel = lookup(telNodes[j].getAttribute('data-edit-tel'));
    if (typeof tel === 'string' && tel.trim()) {
      telNodes[j].setAttribute('href', 'tel:' + tel.replace(/\s+/g, ''));
    }
  }

  var hrefNodes = document.querySelectorAll('[data-edit-href]');
  for (var k = 0; k < hrefNodes.length; k += 1) {
    var href = lookup(hrefNodes[k].getAttribute('data-edit-href'));
    if (typeof href === 'string' && href.trim()) {
      hrefNodes[k].setAttribute('href', href);
    }
  }

  var tplNodes = document.querySelectorAll('[data-edit-template]');
  for (var t = 0; t < tplNodes.length; t += 1) {
    var missing = false;
    var text = tplNodes[t].getAttribute('data-edit-template').replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (_, key) {
      var value = lookup(key);
      if (typeof value !== 'string') {
        missing = true;
        return '';
      }
      return value;
    });
    if (!missing) tplNodes[t].textContent = text;
  }
});
