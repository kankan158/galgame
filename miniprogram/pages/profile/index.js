const { request, upload, getFullImageUrl } = require("../../utils/api");

Page({
  data: {
    profile: {
      nickname: "",
      bio: "",
      avatar_url: ""
    },
    body: {
      height: "",
      weight: "",
      shape: ""
    },
    avatarTempPath: "",
    saving: false
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      wx.showLoading({ title: "加载中" });
      const [profileRes, bodyRes] = await Promise.all([request("/api/profile"), request("/api/bodyinfo")]);
      const profile = profileRes.profile || {};
      const body = bodyRes.body || {};

      this.setData({
        profile: {
          nickname: profile.nickname || "",
          bio: profile.bio || "",
          avatar_url: getFullImageUrl(profile.avatar_url || "")
        },
        body: {
          height: body.height || "",
          weight: body.weight || "",
          shape: body.shape || ""
        }
      });
    } catch (_err) {
      wx.showToast({ title: "加载资料失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  onNicknameInput(e) {
    this.setData({ "profile.nickname": e.detail.value });
  },

  onBioInput(e) {
    this.setData({ "profile.bio": e.detail.value });
  },

  onHeightInput(e) {
    this.setData({ "body.height": e.detail.value });
  },

  onWeightInput(e) {
    this.setData({ "body.weight": e.detail.value });
  },

  onShapeInput(e) {
    this.setData({ "body.shape": e.detail.value });
  },

  onPickAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const filePath = (res.tempFilePaths || [])[0];
        if (!filePath) {
          wx.showToast({ title: "未选择图片", icon: "none" });
          return;
        }

        this.setData({
          avatarTempPath: filePath,
          "profile.avatar_url": filePath
        });
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || "选择头像失败";
        wx.showToast({ title: msg, icon: "none" });
      }
    });
  },

  async onSave() {
    if (this.data.saving) return;

    this.setData({ saving: true });
    wx.showLoading({ title: "保存中" });

    try {
      const profilePayload = {
        nickname: (this.data.profile.nickname || "").trim(),
        bio: (this.data.profile.bio || "").trim()
      };

      if (this.data.avatarTempPath) {
        await upload("/api/profile", this.data.avatarTempPath, "avatar", profilePayload);
      } else {
        await request("/api/profile", { method: "PUT", data: profilePayload });
      }

      await request("/api/bodyinfo", {
        method: "PUT",
        data: {
          height: Number(this.data.body.height) || null,
          weight: Number(this.data.body.weight) || null,
          shape: (this.data.body.shape || "").trim()
        }
      });

      wx.showToast({ title: "保存成功", icon: "success" });
      this.setData({ avatarTempPath: "" });
      await this.loadData();
    } catch (err) {
      const msg = (err && err.message) || "保存失败";
      wx.showToast({ title: msg, icon: "none" });
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  }
});
