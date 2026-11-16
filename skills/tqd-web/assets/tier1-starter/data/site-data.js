/*
 * TỆP DỮ LIỆU CHỦ WEBSITE TỰ SỬA
 * Bạn có thể mở tệp này bằng Notepad/TextEdit để đổi tên tiệm, số điện thoại,
 * link Zalo, giá bán và câu giới thiệu mà không cần chạm vào mã giao diện.
 */
window.SITE_DATA = {
  brandName: 'Tiệm Bánh An Lành',
  siteUrl: 'https://tiembanh-anlanh.vn',
  ogImage: 'https://tiembanh-anlanh.vn/images/hero-bakery.svg',
  metaTitle: 'Tiệm Bánh An Lành | Bánh mì men tự nhiên nướng mới mỗi sáng',
  metaDescription: 'Bánh mì sourdough lên men 18 giờ và bánh ngọt ít ngọt nướng mới lúc 6h30 mỗi ngày tại Hải Châu, Đà Nẵng. Đặt bánh nhanh qua Zalo hoặc gọi trực tiếp.',
  phoneDisplay: '0905 842 619',
  phoneTel: '0905842619',
  zaloUrl: 'https://zalo.me/0905842619',
  address: '42 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
  hours: '07:00 - 21:00 mỗi ngày',
  hero: {
    eyebrow: 'Bếp bánh thủ công tại Hải Châu',
    headline: 'Bánh mì men tự nhiên nướng mới mỗi sáng lúc 6h30',
    subheadline: 'Ủ bột lạnh 18 giờ từ bột mì nguyên cám và bơ lạt, vỏ giòn mỏng, ruột mềm nhẹ bụng và giao nóng trong 45 phút nội thành.',
    primaryCta: 'Nhắn Zalo đặt bánh',
    secondaryCta: 'Gọi 0905 842 619',
  },
  menuSection: {
    heading: 'Ba dòng bánh ra lò đều mỗi ngày',
    summary: 'Mẻ sáng ra lò lúc 6h30 và mẻ chiều lúc 15h00 để bánh luôn giữ độ giòn tự nhiên khi đến tay bạn.',
  },
  offerings: [
    {
      title: 'Bánh mì Sourdough nguyên cám',
      summary: 'Ổ tròn 550g ủ men chua tự nhiên 18 giờ, không phụ gia giữ ẩm.',
      price: '75.000đ / ổ',
    },
    {
      title: 'Croissant bơ Pháp ít ngọt',
      summary: '27 lớp bột cán tay cùng bơ Normandy thơm nhẹ, phù hợp ăn sáng.',
      price: '42.000đ / chiếc',
    },
    {
      title: 'Hộp trà bánh tiếp khách 6 vị',
      summary: 'Sáu chiếc bánh ngọt cỡ vừa cắt sẵn, đóng hộp giấy kèm thiệp ghi chú.',
      price: '210.000đ / hộp',
    },
  ],
  ctaBlock: {
    heading: 'Đặt mẻ bánh nóng cho sáng mai hoặc tiệc nhỏ cuối tuần',
    summary: 'Nhắn trực tiếp qua Zalo để giữ phần bánh mới ra lò đúng giờ bạn cần.',
  },
};

/* Tự động cập nhật thay đổi ngay khi bấm đúp mở index.html trên máy (file://) */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    var data = window.SITE_DATA;
    if (!data) return;

    function lookup(path) {
      var parts = path.split('.');
      var cur = data;
      for (var i = 0; i < parts.length; i += 1) {
        if (cur == null) return undefined;
        cur = cur[parts[i]];
      }
      return cur;
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
  });
}
