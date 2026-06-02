const { request, getFullImageUrl, isRealTryonEnabled } = require("../../utils/api");

const PICKER_CATEGORY_META = {
  all: { label: "全部", icon: "☰" },
  top: { label: "上装", icon: "👕" },
  bottom: { label: "下装", icon: "👖" },
  shoes: { label: "鞋子", icon: "👟" },
  bag: { label: "包包", icon: "👜" },
  accessory: { label: "配饰", icon: "◇" }
};

Page({
  data: {
    modelGender: "female",
    modelImage: "/assets/female.png",
    selectedIds: [],
    selectedItems: [],
    wardrobeCatalog: [],
    outfitName: "今日穿搭",

    pickerVisible: false,
    pickerActiveCategory: "all",
    pickerCategories: Object.keys(PICKER_CATEGORY_META).map((value) => ({
      value,
      label: PICKER_CATEGORY_META[value].label,
      icon: PICKER_CATEGORY_META[value].icon,
      count: 0
    })),
    pickerItems: [],

    tryonRunning: false,
    tryonStatusText: "",
    tryonResultUrl: ""
  },

  onShow() {
    this.loadData();
  },

  onHide() {
    this.clearPollTimer();
  },

  onUnload() {
    this.clearPollTimer();
  },

  clearPollTimer() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  },

  normalizeCategory(category) {
    const value = String(category || "").toLowerCase();
    if (value === "outer" || value === "dress") return "top";
    return value;
  },

  async loadData() {
    try {
      const selectedIds = wx.getStorageSync("selectedWardrobeIds") || [];
      const res = await request("/api/wardrobe");
      const wardrobeCatalog = (res.items || []).map((item) => ({
        ...item,
        category: this.normalizeCategory(item.category || ""),
        fullImageUrl: getFullImageUrl(item.image_url)
      }));

      this.setData({ selectedIds, wardrobeCatalog }, () => {
        this.refreshSelectedItems();
        this.refreshPickerData();
      });
    } catch (_err) {
      wx.showToast({ title: "加载试衣数据失败", icon: "none" });
    }
  },

  refreshSelectedItems() {
    const { wardrobeCatalog, selectedIds } = this.data;
    const selectedItems = wardrobeCatalog.filter((item) => selectedIds.includes(Number(item.id)));
    this.setData({ selectedItems });
  },

  refreshPickerData() {
    const { wardrobeCatalog, pickerActiveCategory, selectedIds } = this.data;

    const countMap = wardrobeCatalog.reduce((acc, item) => {
      const key = item.category || "";
      if (!acc[key]) acc[key] = 0;
      acc[key] += 1;
      return acc;
    }, {});

    const pickerCategories = this.data.pickerCategories.map((item) => ({
      ...item,
      count: item.value === "all" ? wardrobeCatalog.length : countMap[item.value] || 0
    }));

    const sourceItems =
      pickerActiveCategory === "all"
        ? wardrobeCatalog
        : wardrobeCatalog.filter((item) => (item.category || "") === pickerActiveCategory);

    const pickerItems = sourceItems.map((item) => {
      const added = selectedIds.includes(Number(item.id));
      return {
        ...item,
        added,
        cardClass: added ? "picker-item added" : "picker-item",
        showName: item.name || "未命名单品",
        showMeta: item.category || "未分类"
      };
    });

    this.setData({ pickerCategories, pickerItems });
  },

  onRename() {
    wx.showModal({
      title: "修改穿搭名称",
      editable: true,
      placeholderText: "输入名称",
      success: (res) => {
        if (!res.confirm) return;
        const value = (res.content || "").trim();
        if (!value) return;
        this.setData({ outfitName: value });
      }
    });
  },

  onOpenPicker() {
    this.refreshPickerData();
    this.setData({ pickerVisible: true });
  },

  onClosePicker() {
    this.setData({ pickerVisible: false });
  },

  onPickerSwitchCategory(e) {
    this.setData({ pickerActiveCategory: e.currentTarget.dataset.value }, () => this.refreshPickerData());
  },

  onPickerAddItem(e) {
    const id = Number(e.currentTarget.dataset.id);
    const selectedIds = [...this.data.selectedIds];

    if (selectedIds.includes(id)) {
      wx.showToast({ title: "已在试衣列表中", icon: "none" });
      return;
    }

    selectedIds.push(id);
    wx.setStorageSync("selectedWardrobeIds", selectedIds);
    this.setData({ selectedIds }, () => {
      this.refreshSelectedItems();
      this.refreshPickerData();
    });

    wx.showToast({ title: "已加入试衣", icon: "success" });
  },

  async onRegenerate() {
    if (this.data.tryonRunning) return;

    if (!this.data.selectedItems.length) {
      wx.showToast({ title: "请先添加单品", icon: "none" });
      return;
    }

    if (this.data.selectedItems.length > 2) {
      wx.showToast({ title: "当前最多支持2件同时试穿", icon: "none" });
      return;
    }

    try {
      const selectedItems = this.data.selectedItems.slice();

      // 仅在真实后端试穿时，拦截 tmp 临时图。
      if (isRealTryonEnabled()) {
        const tempItem = selectedItems.find((item) => {
          const rawImageUrl = String(item.image_url || "");
          return /^https?:\/\/tmp[\/:]/i.test(rawImageUrl) || /^tmp[\/\\]/i.test(rawImageUrl);
        });

        if (tempItem) {
          wx.showToast({ title: "有衣物是临时图，请在衣橱重新上传后再试", icon: "none" });
          return;
        }
      }

      this.clearPollTimer();
      this.setData({
        tryonRunning: true,
        tryonStatusText: "正在生成试穿效果...",
        tryonResultUrl: ""
      });

      const submit = await request("/api/tryon/jobs", {
        method: "POST",
        data: {
          model_image_url: this.data.modelImage,
          garment_ids: selectedItems.map((item) => Number(item.id)).filter((x) => Number.isFinite(x)),
          gender: this.data.modelGender
        }
      });

      if (!submit || !submit.job_id) {
        throw new Error("生成任务创建失败");
      }

      this.pollTryonResult(submit.job_id, 0);
    } catch (err) {
      const reason = (err && err.message) || "生成失败";
      this.setData({ tryonRunning: false, tryonStatusText: "生成失败" });
      wx.showToast({ title: reason, icon: "none" });
    }
  },

  async pollTryonResult(jobId, attempt) {
    const maxAttempts = 120;

    try {
      const res = await request(`/api/tryon/jobs/${jobId}`);
      const job = (res && res.job) || {};

      if (job.status === "success") {
        this.setData({
          tryonRunning: false,
          tryonStatusText: "已生成",
          tryonResultUrl: getFullImageUrl(job.result_image_url || "")
        });
        return;
      }

      if (job.status === "failed") {
        const reason = job.error || "生成失败";
        this.setData({ tryonRunning: false, tryonStatusText: "生成失败" });
        wx.showToast({ title: reason, icon: "none" });
        return;
      }

      if (attempt >= maxAttempts) {
        this.setData({ tryonRunning: false, tryonStatusText: "生成超时" });
        wx.showToast({ title: "生成超时", icon: "none" });
        return;
      }

      this.pollTimer = setTimeout(() => this.pollTryonResult(jobId, attempt + 1), 1500);
    } catch (err) {
      const reason = (err && err.message) || "生成失败";
      const transient = /timeout|timed out|request:fail/i.test(reason);

      if (transient && attempt < maxAttempts) {
        this.setData({ tryonStatusText: "网络较慢，继续生成中..." });
        this.pollTimer = setTimeout(() => this.pollTryonResult(jobId, attempt + 1), 2000);
        return;
      }

      this.setData({ tryonRunning: false, tryonStatusText: "生成失败" });
      wx.showToast({ title: reason, icon: "none" });
    }
  },

  onClearSelected() {
    wx.showModal({
      title: "清空确认",
      content: "确定清空试衣列表吗？",
      success: (res) => {
        if (!res.confirm) return;
        wx.setStorageSync("selectedWardrobeIds", []);
        this.setData({ selectedIds: [] }, () => {
          this.refreshSelectedItems();
          this.refreshPickerData();
        });
      }
    });
  },

  onPreviewImage(e) {
    const current = e.currentTarget.dataset.url;
    const urls = this.data.selectedItems.map((x) => x.fullImageUrl).filter(Boolean);
    if (!current) return;
    wx.previewImage({ current, urls });
  },

  onPreviewStage() {
    const current = this.data.tryonResultUrl || this.data.modelImage;
    if (!current) return;
    wx.previewImage({ current, urls: [current] });
  },

  onSaveResultImage() {
    const imageUrl = String(this.data.tryonResultUrl || "").trim();
    if (!imageUrl) {
      wx.showToast({ title: "请先生成试穿图", icon: "none" });
      return;
    }

    if (/127\.0\.0\.1|localhost/i.test(imageUrl)) {
      wx.showModal({
        title: "真机无法保存本地地址图片",
        content:
          "当前图片地址是本机 localhost/127.0.0.1，手机访问不到。请把后端部署到可访问域名或局域网 IP 后再保存。",
        showCancel: false
      });
      return;
    }

    const doSave = () => {
      wx.showLoading({ title: "保存中..." });
      wx.downloadFile({
        url: imageUrl,
        success: (res) => {
          if (res.statusCode !== 200) {
            wx.hideLoading();
            wx.showToast({ title: "下载失败", icon: "none" });
            return;
          }

          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: "已保存到相册", icon: "success" });
            },
            fail: (err) => {
              wx.hideLoading();
              const msg = String((err && err.errMsg) || "");
              if (msg.includes("auth deny") || msg.includes("auth denied")) {
                wx.showModal({
                  title: "需要相册权限",
                  content: "请在设置中开启“保存到相册”权限后重试。",
                  confirmText: "去设置",
                  success: (r) => {
                    if (r.confirm) wx.openSetting();
                  }
                });
                return;
              }
              wx.showToast({ title: "保存失败", icon: "none" });
            }
          });
        },
        fail: (err) => {
          wx.hideLoading();
          const msg = (err && err.errMsg) || "下载失败";
          wx.showToast({ title: msg, icon: "none" });
        }
      });
    };

    wx.getSetting({
      success: (res) => {
        const authorized = !!res.authSetting["scope.writePhotosAlbum"];
        if (authorized) {
          doSave();
          return;
        }

        wx.authorize({
          scope: "scope.writePhotosAlbum",
          success: doSave,
          fail: () => {
            wx.showModal({
              title: "需要相册权限",
              content: "保存图片需要相册权限，请点击“去设置”开启后重试。",
              confirmText: "去设置",
              success: (r) => {
                if (r.confirm) wx.openSetting();
              }
            });
          }
        });
      },
      fail: doSave
    });
  },

  noop() {}
});