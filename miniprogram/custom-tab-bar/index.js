Component({
  data: {
    selected: 0,
    tabs: [
      { pagePath: "pages/wardrobe/index", text: "衣橱", icon: "🧥" },
      { pagePath: "pages/tryon/index", text: "试穿", icon: "✨" },
      { pagePath: "pages/profile/index", text: "我的", icon: "👤" }
    ]
  },

  lifetimes: {
    attached() {
      this.updateSelected();
    }
  },

  pageLifetimes: {
    show() {
      this.updateSelected();
    }
  },

  methods: {
    updateSelected() {
      const pages = getCurrentPages();
      const current = pages && pages.length ? pages[pages.length - 1] : null;
      const route = current ? current.route : "";
      const idx = this.data.tabs.findIndex((tab) => tab.pagePath === route);
      if (idx >= 0 && idx !== this.data.selected) {
        this.setData({ selected: idx });
      }
    },

    onSwitchTab(e) {
      const index = Number(e.currentTarget.dataset.index);
      const tab = this.data.tabs[index];
      if (!tab) return;
      this.setData({ selected: index });
      wx.switchTab({ url: `/${tab.pagePath}` });
    }
  }
});
