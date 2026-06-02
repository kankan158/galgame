const STORAGE_KEYS = {
  wardrobe: "mock_wardrobe_items",
  profile: "mock_profile",
  body: "mock_body",
  tryonJobs: "mock_tryon_jobs"
};

function getBaseUrl() {
  const app = getApp();
  const fallback = "http://127.0.0.1:3000";
  const baseUrl = (app && app.globalData && app.globalData.baseUrl) || fallback;
  const mobileBaseUrl = (app && app.globalData && app.globalData.mobileBaseUrl) || "";

  if (isRealDevice() && mobileBaseUrl) return mobileBaseUrl;
  return baseUrl;
}

function isRealDevice() {
  try {
    const sys = wx.getSystemInfoSync();
    const platform = String(sys && sys.platform ? sys.platform : "").toLowerCase();
    return platform !== "devtools";
  } catch (_err) {
    return false;
  }
}

function isLocalhostUrl(url) {
  return /127\.0\.0\.1|localhost/i.test(String(url || ""));
}

function shouldUseMockApi() {
  const app = getApp();
  const baseUrl = getBaseUrl();
  const appSwitch = app && app.globalData && app.globalData.useMockApi;

  // Real device cannot access localhost on developer machine.
  if (isRealDevice() && isLocalhostUrl(baseUrl)) return true;
  if (typeof appSwitch === "boolean") return appSwitch;
  return isLocalhostUrl(baseUrl);
}

function shouldUseRealTryon(url) {
  const app = getApp();
  const baseUrl = getBaseUrl();
  const explicit = app && app.globalData ? app.globalData.useRealTryon : undefined;
  if (!String(url || "").startsWith("/api/tryon/")) return false;
  if (explicit === false) return false;
  if (isRealDevice() && isLocalhostUrl(baseUrl)) return false;
  return true;
}

function getFullImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("wxfile://")) return path;
  if (path.startsWith("file://")) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/assets/")) return path;
  if (path.startsWith("/")) return `${getBaseUrl()}${path}`;
  return `${getBaseUrl()}/${path}`;
}

function persistLocalImageForMock(filePath) {
  return new Promise((resolve) => {
    const raw = String(filePath || "");
    if (!raw || raw.startsWith("http://") || raw.startsWith("https://")) {
      resolve(raw);
      return;
    }

    // For real-device mock mode, persist temp image to avoid being recycled.
    wx.saveFile({
      tempFilePath: raw,
      success: (res) => resolve(res.savedFilePath || raw),
      fail: () => resolve(raw)
    });
  });
}

function now() {
  return Date.now();
}

function initMockWardrobe() {
  const exists = wx.getStorageSync(STORAGE_KEYS.wardrobe);
  if (Array.isArray(exists) && exists.length > 0) return exists;
  const initial = [
    {
      id: 1,
      category: "top",
      name: "白色短袖",
      note: "上装",
      image_url:
        "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=640&q=80",
      created_at: now() - 2000
    },
    {
      id: 2,
      category: "top",
      name: "白色背心",
      note: "上装 · 白搭内搭",
      image_url:
        "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?auto=format&fit=crop&w=640&q=80",
      created_at: now() - 1000
    }
  ];
  wx.setStorageSync(STORAGE_KEYS.wardrobe, initial);
  return initial;
}

function readWardrobe() {
  return initMockWardrobe().slice().sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

function writeWardrobe(items) {
  wx.setStorageSync(STORAGE_KEYS.wardrobe, items);
}

function readProfile() {
  const data = wx.getStorageSync(STORAGE_KEYS.profile);
  if (data && typeof data === "object") return data;
  const initial = { id: 1, nickname: "", bio: "", avatar_url: "" };
  wx.setStorageSync(STORAGE_KEYS.profile, initial);
  return initial;
}

function writeProfile(profile) {
  wx.setStorageSync(STORAGE_KEYS.profile, profile);
}

function readBody() {
  const data = wx.getStorageSync(STORAGE_KEYS.body);
  if (data && typeof data === "object") return data;
  const initial = { id: 1, height: "", weight: "", shape: "" };
  wx.setStorageSync(STORAGE_KEYS.body, initial);
  return initial;
}

function writeBody(body) {
  wx.setStorageSync(STORAGE_KEYS.body, body);
}

function readTryonJobs() {
  const data = wx.getStorageSync(STORAGE_KEYS.tryonJobs);
  if (data && typeof data === "object") return data;
  const initial = {};
  wx.setStorageSync(STORAGE_KEYS.tryonJobs, initial);
  return initial;
}

function writeTryonJobs(jobs) {
  wx.setStorageSync(STORAGE_KEYS.tryonJobs, jobs || {});
}

function parseWardrobeId(url) {
  const match = String(url).match(/^\/api\/wardrobe\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function parseTryonJobId(url) {
  const match = String(url).match(/^\/api\/tryon\/jobs\/([a-zA-Z0-9_-]+)$/);
  return match ? match[1] : null;
}

function requestMock(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const data = options.data || {};

  if (url === "/api/wardrobe" && method === "GET") {
    return Promise.resolve({ ok: true, items: readWardrobe() });
  }

  if (url === "/api/wardrobe" && method === "POST") {
    const items = readWardrobe();
    const id = items.length ? Math.max(...items.map((x) => Number(x.id) || 0)) + 1 : 1;
    const item = {
      id,
      category: data.category || "",
      name: data.name || "",
      note: data.note || "",
      image_url: data.image_url || "",
      created_at: now()
    };
    items.unshift(item);
    writeWardrobe(items);
    return Promise.resolve({ ok: true, item });
  }

  const wardrobeId = parseWardrobeId(url);
  if (wardrobeId != null && (method === "PUT" || method === "POST")) {
    const items = readWardrobe();
    const idx = items.findIndex((x) => Number(x.id) === wardrobeId);
    if (idx < 0) return Promise.reject(new Error("not found"));
    items[idx] = {
      ...items[idx],
      category: data.category ?? items[idx].category,
      name: data.name ?? items[idx].name,
      note: data.note ?? items[idx].note,
      image_url: data.image_url ?? items[idx].image_url
    };
    writeWardrobe(items);
    return Promise.resolve({ ok: true, item: items[idx] });
  }

  if (wardrobeId != null && method === "DELETE") {
    const items = readWardrobe().filter((x) => Number(x.id) !== wardrobeId);
    writeWardrobe(items);
    return Promise.resolve({ ok: true });
  }

  if (url === "/api/profile" && method === "GET") {
    return Promise.resolve({ ok: true, profile: readProfile() });
  }

  if (url === "/api/profile" && (method === "PUT" || method === "POST")) {
    const old = readProfile();
    const next = {
      ...old,
      nickname: data.nickname ?? old.nickname,
      bio: data.bio ?? old.bio,
      avatar_url: data.avatar_url ?? old.avatar_url
    };
    writeProfile(next);
    return Promise.resolve({ ok: true, profile: next });
  }

  if (url === "/api/bodyinfo" && method === "GET") {
    return Promise.resolve({ ok: true, body: readBody() });
  }

  if (url === "/api/bodyinfo" && (method === "PUT" || method === "POST")) {
    const old = readBody();
    const next = {
      ...old,
      height: data.height ?? old.height,
      weight: data.weight ?? old.weight,
      shape: data.shape ?? old.shape
    };
    writeBody(next);
    return Promise.resolve({ ok: true, body: next });
  }

  if (url === "/api/tryon/jobs" && method === "POST") {
    const garmentIds = Array.isArray(data.garment_ids) ? data.garment_ids.map((x) => Number(x)) : [];
    if (garmentIds.length === 0) {
      return Promise.reject(new Error("garment_ids is required"));
    }

    const wardrobe = readWardrobe();
    const selected = wardrobe.filter((x) => garmentIds.includes(Number(x.id)));
    const modelImage = data.model_image_url || data.modelImage || "/assets/female.png";
    const previewGarment = selected[0] || null;
    const jobId = `job_${now()}_${Math.floor(Math.random() * 10000)}`;
    const jobs = readTryonJobs();

    jobs[jobId] = {
      id: jobId,
      status: "running",
      created_at: now(),
      model_image_url: modelImage,
      result_image_url: modelImage,
      preview_garment_id: previewGarment ? previewGarment.id : null,
      preview_garment_name: previewGarment ? previewGarment.name || "" : ""
    };
    writeTryonJobs(jobs);

    return Promise.resolve({ ok: true, job_id: jobId, status: "running" });
  }

  const tryonJobId = parseTryonJobId(url);
  if (tryonJobId && method === "GET") {
    const jobs = readTryonJobs();
    const job = jobs[tryonJobId];
    if (!job) return Promise.reject(new Error("tryon job not found"));

    // Simulate async try-on inference.
    if (job.status === "running" && now() - Number(job.created_at || 0) > 1500) {
      job.status = "success";
      jobs[tryonJobId] = job;
      writeTryonJobs(jobs);
    }

    return Promise.resolve({
      ok: true,
      job: {
        id: job.id,
        status: job.status,
        result_image_url: job.result_image_url,
        preview_garment_id: job.preview_garment_id,
        preview_garment_name: job.preview_garment_name
      }
    });
  }

  return Promise.reject(new Error(`Mock route not found: ${method} ${url}`));
}

function requestRemote(url, options = {}) {
  const { method = "GET", data = null, header = {} } = options;
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}${url}`,
      method,
      timeout: 120000,
      data,
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(new Error((res.data && res.data.error) || `HTTP ${res.statusCode}`));
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

function isBackendOfflineError(err) {
  const text = String(
    (err && (err.errMsg || err.message || err.toString())) || ""
  ).toLowerCase();
  return (
    text.includes("connection refused") ||
    text.includes("fail connect") ||
    text.includes("timed out") ||
    text.includes("timeout")
  );
}

function request(url, options = {}) {
  if (shouldUseRealTryon(url)) {
    return requestRemote(url, options).catch((err) => {
      if (isBackendOfflineError(err)) {
        throw new Error("本地后端未启动，请先运行 node server.js");
      }
      throw err;
    });
  }
  if (shouldUseMockApi()) return requestMock(url, options);

  return requestRemote(url, options).catch((err) => {
    // If local backend is offline, fallback to mock for non-tryon APIs.
    if (isBackendOfflineError(err)) {
      return requestMock(url, options);
    }
    throw err;
  });
}

function isRealTryonEnabled() {
  return shouldUseRealTryon("/api/tryon/jobs");
}

function upload(url, filePath, name, formData = {}) {
  if (shouldUseMockApi()) {
    if (url === "/api/profile") {
      return persistLocalImageForMock(filePath).then((savedPath) =>
        requestMock(url, {
          method: "POST",
          data: {
            ...formData,
            avatar_url: savedPath
          }
        })
      );
    }

    if (url === "/api/wardrobe") {
      return persistLocalImageForMock(filePath).then((savedPath) =>
        requestMock(url, {
          method: "POST",
          data: {
            ...formData,
            image_url: savedPath
          }
        })
      );
    }

    const wardId = parseWardrobeId(url);
    if (wardId != null) {
      return persistLocalImageForMock(filePath).then((savedPath) =>
        requestMock(url, {
          method: "POST",
          data: {
            ...formData,
            image_url: savedPath
          }
        })
      );
    }
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getBaseUrl()}${url}`,
      filePath,
      name,
      formData,
      success(res) {
        try {
          const data = JSON.parse(res.data || "{}");
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
            return;
          }
          reject(new Error((data && data.error) || `HTTP ${res.statusCode}`));
        } catch (err) {
          reject(err);
        }
      },
      fail(err) {
        // If local backend is offline, fallback to mock for profile/wardrobe uploads.
        if (isBackendOfflineError(err)) {
          if (url === "/api/profile") {
            persistLocalImageForMock(filePath)
              .then((savedPath) =>
                requestMock(url, {
                  method: "POST",
                  data: { ...formData, avatar_url: savedPath }
                })
              )
              .then(resolve)
              .catch(reject);
            return;
          }

          if (url === "/api/wardrobe") {
            persistLocalImageForMock(filePath)
              .then((savedPath) =>
                requestMock(url, {
                  method: "POST",
                  data: { ...formData, image_url: savedPath }
                })
              )
              .then(resolve)
              .catch(reject);
            return;
          }

          const wardId = parseWardrobeId(url);
          if (wardId != null) {
            persistLocalImageForMock(filePath)
              .then((savedPath) =>
                requestMock(url, {
                  method: "POST",
                  data: { ...formData, image_url: savedPath }
                })
              )
              .then(resolve)
              .catch(reject);
            return;
          }
        }

        reject(err);
      }
    });
  });
}

module.exports = {
  getBaseUrl,
  getFullImageUrl,
  isRealTryonEnabled,
  request,
  upload
};
