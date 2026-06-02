const { request, getFullImageUrl } = require("../../utils/api");

const CATEGORY_META = {
  all: { label: "全部", icon: "☰", showCount: false },
  top: { label: "上装", icon: "👕", showCount: true },
  bottom: { label: "下装", icon: "👖", showCount: true },
  shoes: { label: "鞋子", icon: "👟", showCount: true },
  bag: { label: "包包", icon: "👜", showCount: true },
  accessory: { label: "配饰", icon: "◇", showCount: true }
};

Page({
  data: {
    loading: false,
    categories: Object.keys(CATEGORY_META).map((value) => ({
      value,
      label: CATEGORY_META[value].label,
      icon: CATEGORY_META[value].icon,
      showCount: CATEGORY_META[value].showCount,
      count: 0
    })),
    activeCategory: "all",
    items: [],
    filteredItems: [],
    selectedIds: []
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  normalizeCategory(category) {
    const value = String(category || "").toLowerCase();
    if (value === "outer") return "top";
    if (value === "dress") return "top";
    return value;
  },

  async loadData() {
    try {
      this.setData({ loading: true, selectedIds: wx.getStorageSync("selectedWardrobeIds") || [] });
      const res = await request("/api/wardrobe");
      const items = (res.items || []).map((item) => ({
        ...item,
        category: this.normalizeCategory(item.category || ""),
        fullImageUrl: getFullImageUrl(item.image_url)
      }));

      this.setData({ items });
      this.applyFilterAndCount();
    } catch (err) {
      wx.showToast({ title: "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  applyFilterAndCount() {
    const { items, activeCategory, selectedIds } = this.data;

    const countMap = items.reduce((acc, item) => {
      const key = item.category || "";
      if (!acc[key]) acc[key] = 0;
      acc[key] += 1;
      return acc;
    }, {});

    const categories = this.data.categories.map((item) => ({
      ...item,
      count: item.value === "all" ? items.length : countMap[item.value] || 0
    }));

    const sourceItems =
      activeCategory === "all" ? items : items.filter((item) => (item.category || "") === activeCategory);

    const filteredItems = sourceItems.map((item) => {
      const isSelected = selectedIds.indexOf(Number(item.id)) >= 0;
      const displayName = item.name || "未命名单品";
      const categoryText = item.category || "未分类";
      const displayMeta = item.note ? `${categoryText} · ${item.note}` : categoryText;
      return {
        ...item,
        displayName,
        displayMeta,
        cardClass: isSelected ? "item-card selected" : "item-card"
      };
    });

    this.setData({ categories, filteredItems });
  },

  onSwitchCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.value }, () => this.applyFilterAndCount());
  },

  onToggleSelect(e) {
    const id = Number(e.currentTarget.dataset.id);
    const selectedIds = [...this.data.selectedIds];
    const idx = selectedIds.indexOf(id);
    if (idx >= 0) {
      selectedIds.splice(idx, 1);
    } else {
      selectedIds.push(id);
    }

    wx.setStorageSync("selectedWardrobeIds", selectedIds);
    this.setData({ selectedIds });
    this.applyFilterAndCount();
  },

  onAdd() {
    wx.navigateTo({ url: "/pages/wardrobe/edit" });
  },

  onEdit(e) {
    const id = Number(e.currentTarget.dataset.id);
    wx.navigateTo({ url: `/pages/wardrobe/edit?id=${id}` });
  },

  onPreviewImage(e) {
    const current = e.currentTarget.dataset.url;
    const urls = this.data.items.map((x) => x.fullImageUrl).filter(Boolean);
    if (!current) return;
    wx.previewImage({ current, urls });
  }
});
