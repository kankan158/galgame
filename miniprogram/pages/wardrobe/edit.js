const { request, upload, getFullImageUrl } = require("../../utils/api");

Page({
  data: {
    id: null,
    isEdit: false,
    categories: [
      { label: "上装", value: "top" },
      { label: "下装", value: "bottom" },
      { label: "连衣裙", value: "dress" },
      { label: "外套", value: "outer" },
      { label: "鞋子", value: "shoes" },
      { label: "配饰", value: "accessory" }
    ],
    categoryIndex: 0,
    name: "",
    note: "",
    imagePath: "",
    previewUrl: "",
    submitting: false
  },

  async onLoad(query) {
    if (!query.id) return;
    const id = Number(query.id);
    this.setData({ id, isEdit: true });
    await this.loadItem(id);
  },

  async loadItem(id) {
    try {
      wx.showLoading({ title: "加载中" });
      const res = await request("/api/wardrobe");
      const item = (res.items || []).find((x) => Number(x.id) === id);
      if (!item) {
        wx.showToast({ title: "衣物不存在", icon: "none" });
        return;
      }
      const idx = this.data.categories.findIndex((x) => x.value === (item.category || ""));
      this.setData({
        categoryIndex: idx >= 0 ? idx : 0,
        name: item.name || "",
        note: item.note || "",
        previewUrl: getFullImageUrl(item.image_url)
      });
    } catch (err) {
      wx.showToast({ title: "加载失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  onPickImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        this.setData({
          imagePath: file.tempFilePath,
          previewUrl: file.tempFilePath
        });
      }
    });
  },

  async onSubmit() {
    if (this.data.submitting) return;
    const category = this.data.categories[this.data.categoryIndex].value;
    const name = (this.data.name || "").trim();
    const note = (this.data.note || "").trim();

    if (!name) {
      wx.showToast({ title: "请输入衣物名称", icon: "none" });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: "保存中" });
    try {
      if (this.data.imagePath) {
        const url = this.data.isEdit ? `/api/wardrobe/${this.data.id}` : "/api/wardrobe";
        await upload(url, this.data.imagePath, "image", { category, name, note });
      } else if (this.data.isEdit) {
        await request(`/api/wardrobe/${this.data.id}`, {
          method: "PUT",
          data: { category, name, note }
        });
      } else {
        wx.showToast({ title: "新增请先选择图片", icon: "none" });
        return;
      }

      wx.showToast({ title: "保存成功", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (err) {
      wx.showToast({ title: "保存失败", icon: "none" });
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  }
});
