/**
 * 身份证实名认证API
 */
import { getToken } from '@/utils/auth.js';
import { API_BASE_URL } from '@/utils/config.js';

/**
 * OCR识别身份证（只上传图片，自动识别姓名和身份证号）
 * @param {String} frontImagePath 身份证正面图片路径
 * @param {String} backImagePath 身份证反面图片路径（可选）
 */
export function ocrRecognizeIdCard(frontImagePath, backImagePath) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const header = {};
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }

    console.log('📤 开始上传图片进行OCR识别...');
    
    // 先上传正面图片
    uni.uploadFile({
      url: `${API_BASE_URL}/idcard/ocr-recognize`,
      filePath: frontImagePath,
      name: 'frontImage',
      header,
      timeout: 30000, // 30秒超时（移动端网络可能较慢）
      success: (frontRes) => {
        try {
          const frontData = typeof frontRes.data === 'string' ? JSON.parse(frontRes.data) : frontRes.data;
          
          // 即使OCR识别不完整（partial），也返回成功，让前端处理
          if (frontData.success === false && !frontData.partial) {
            // 只有完全失败时才reject
            reject(new Error(frontData.message || 'OCR识别失败'));
            return;
          }
          // partial或success都resolve，让前端判断
          
          // 如果上传了反面图片，继续上传反面
          if (backImagePath) {
            uni.uploadFile({
              url: `${API_BASE_URL}/idcard/ocr-recognize`,
              filePath: backImagePath,
              name: 'backImage',
              formData: {
                frontImageId: frontData.frontImageId || ''
              },
              header,
              timeout: 30000, // 30秒超时（移动端网络可能较慢）
              success: (backRes) => {
                try {
                  const backData = typeof backRes.data === 'string' ? JSON.parse(backRes.data) : backRes.data;
                  if (backData.success) {
                    // 合并结果
                    const mergedData = {
                      ...frontData,
                      data: {
                        ...frontData.data,
                        issueDate: backData.data?.issueDate || '',
                        expiryDate: backData.data?.expiryDate || '',
                        issueAuthority: backData.data?.issueAuthority || ''
                      },
                      backImageId: backData.backImageId || frontData.backImageId
                    };
                    console.log('✅ OCR识别成功（包含反面）:', mergedData.data);
                    resolve(mergedData);
                  } else {
                    // 反面识别失败，但正面成功，仍然返回正面结果
                    console.log('⚠️ 反面识别失败，但正面识别成功');
                    resolve(frontData);
                  }
                } catch (e) {
                  console.error('解析反面OCR识别响应失败:', e);
                  // 反面失败，返回正面结果
                  resolve(frontData);
                }
              },
              fail: (err) => {
                console.warn('上传反面图片失败，但正面识别成功:', err);
                // 反面失败，返回正面结果
                resolve(frontData);
              }
            });
          } else {
            // 只有正面图片
            console.log('✅ OCR识别成功:', frontData.data);
            resolve(frontData);
          }
        } catch (e) {
          console.error('解析OCR识别响应失败:', e);
          reject(new Error('解析OCR识别响应失败'));
        }
      },
      fail: (err) => {
        console.error('OCR识别请求失败:', err);
        let errorMsg = 'OCR识别请求失败';
        if (err.errMsg) {
          if (err.errMsg.includes('timeout') || err.errMsg.includes('超时')) {
            errorMsg = '上传超时，请检查网络连接后重试';
          } else if (err.errMsg.includes('fail') || err.errMsg.includes('失败')) {
            errorMsg = '网络请求失败，请检查网络连接';
          } else {
            errorMsg = `OCR识别请求失败: ${err.errMsg}`;
          }
        } else {
          errorMsg = 'OCR识别请求失败: 网络错误';
        }
        reject(new Error(errorMsg));
      }
    });
  });
}

/**
 * 人脸身份证比对认证（使用图二中的AppCode）
 * @param {String} name 姓名
 * @param {String} idNumber 身份证号
 * @param {String} frontImageId 正面图片ID（可选，如果传了faceImageId）
 * @param {String} backImageId 反面图片ID（可选）
 * @param {String} faceImageId 人脸照片ID（可选，优先使用）
 */
export function faceVerifyIdCard(name, idNumber, frontImageId, backImageId, faceImageId) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const header = {};
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }

    const requestUrl = `${API_BASE_URL}/idcard/face-verify`;
    console.log('📤 开始调用人脸身份证比对API...');
    console.log('📤 API地址:', requestUrl);
    console.log('📤 参数:', { name, idNumber, frontImageId, backImageId, faceImageId });
    
    uni.request({
      url: requestUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        ...header
      },
      data: {
        name: name.trim(),
        idNumber: idNumber.trim().toUpperCase(),
        frontImageId: frontImageId || '',
        backImageId: backImageId || '',
        faceImageId: faceImageId || '' // 优先使用人脸照片
      },
      timeout: 30000, // 30秒超时
      success: (res) => {
        console.log('📥 收到响应:', {
          statusCode: res.statusCode,
          data: res.data
        });
        
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          const errorMsg = res.data?.message || res.data?.error || `请求失败 (HTTP ${res.statusCode})`;
          console.error('❌ 服务器返回错误:', {
            statusCode: res.statusCode,
            message: errorMsg,
            data: res.data
          });
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        console.error('❌ 人脸身份证比对请求失败:', err);
        console.error('❌ 请求URL:', requestUrl);
        console.error('❌ API_BASE_URL:', API_BASE_URL);
        console.error('❌ 错误详情:', JSON.stringify(err, null, 2));
        
        // 根据错误类型提供更详细的错误信息
        let errorMessage = '人脸身份证比对请求失败';
        
        if (err.errMsg) {
          if (err.errMsg.includes('timeout') || err.errMsg.includes('超时')) {
            errorMessage = `请求超时\n\n请检查：\n1. 后端服务是否正常运行（${API_BASE_URL}）\n2. 网络连接是否正常\n3. 服务器响应是否过慢`;
          } else if (err.errMsg.includes('fail') || err.errMsg.includes('失败')) {
            errorMessage = `网络请求失败\n\n请检查：\n1. 后端服务是否启动（${API_BASE_URL}）\n2. 网络连接是否正常\n3. 接口地址是否正确\n4. 是否有CORS跨域问题`;
          } else if (err.errMsg.includes('abort')) {
            errorMessage = '请求被取消';
          } else {
            errorMessage = `请求失败: ${err.errMsg}`;
          }
        } else {
          errorMessage = `网络请求失败: ${JSON.stringify(err)}`;
        }
        
        reject(new Error(errorMessage));
      }
    });
  });
}

/**
 * 身份证实名认证（支持图片上传和验证）
 * @param {String} name 姓名
 * @param {String} idNumber 身份证号
 * @param {String} frontImagePath 身份证正面图片路径（可选，如果有imageId）
 * @param {String} backImagePath 身份证反面图片路径（可选，如果有imageId）
 * @param {String} frontImageId 正面图片ID（可选，如果已通过OCR识别）
 * @param {String} backImageId 反面图片ID（可选，如果已通过OCR识别）
 */
export function verifyIdCard(name, idNumber, frontImagePath, backImagePath, frontImageId, backImageId) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const header = {};
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }

    // 如果已经有图片ID（通过OCR识别获得），直接使用
    if (frontImageId && backImageId) {
      console.log('📤 使用已识别的图片ID进行认证...');
      uni.request({
        url: `${API_BASE_URL}/idcard/verify`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          ...header
        },
        data: {
          name: name.trim(),
          idNumber: idNumber.trim().toUpperCase(),
          frontImageId: frontImageId,
          backImageId: backImageId
        },
        success: (verifyRes) => {
          if (verifyRes.statusCode === 200) {
            resolve(verifyRes.data);
          } else {
            const errorMsg = verifyRes.data?.message || '验证失败';
            reject(new Error(errorMsg));
          }
        },
        fail: (err) => {
          console.error('❌ 验证请求失败:', err);
          reject(new Error('验证请求失败: ' + (err.errMsg || '网络错误')));
        }
      });
      return;
    }
    
    console.log('📤 开始上传身份证正面图片...');
    console.log('图片路径:', frontImagePath);
    
    // 先上传身份证正面图片
    uni.uploadFile({
      url: `${API_BASE_URL}/idcard/upload-front`,
      filePath: frontImagePath,
      name: 'frontImage',
      formData: {
        name: name.trim(),
        idNumber: idNumber.trim().toUpperCase()
      },
      header,
      timeout: 30000, // 30秒超时（移动端网络可能较慢）
      success: (frontRes) => {
        console.log('📥 正面图片上传响应:', frontRes);
        try {
          const frontData = typeof frontRes.data === 'string' ? JSON.parse(frontRes.data) : frontRes.data;
          console.log('✅ 正面图片上传成功，imageId:', frontData.imageId || frontData.data?.imageId);
          
          // 上传身份证反面图片
          uni.uploadFile({
            url: `${API_BASE_URL}/idcard/upload-back`,
            filePath: backImagePath,
            name: 'backImage',
            formData: {
              name: name.trim(),
              idNumber: idNumber.trim().toUpperCase(),
              frontImageId: frontData.imageId || frontData.data?.imageId || ''
            },
            header,
            timeout: 30000, // 30秒超时（移动端网络可能较慢）
            success: (backRes) => {
              try {
                const backData = typeof backRes.data === 'string' ? JSON.parse(backRes.data) : backRes.data;
                
                // 调用验证接口
                uni.request({
                  url: `${API_BASE_URL}/idcard/verify`,
                  method: 'POST',
                  header: {
                    'Content-Type': 'application/json',
                    ...header
                  },
                  data: {
                    name: name.trim(),
                    idNumber: idNumber.trim().toUpperCase(),
                    frontImageId: frontData.imageId || frontData.data?.imageId,
                    backImageId: backData.imageId || backData.data?.imageId
                  },
                  timeout: 30000, // 30秒超时（移动端网络可能较慢）
                  success: (verifyRes) => {
                    if (verifyRes.statusCode === 200) {
                      resolve(verifyRes.data);
                    } else {
                      const errorMsg = verifyRes.data?.message || '验证失败';
                      // 不在这里显示toast，让页面统一处理弹框
                      console.error('验证接口返回错误:', errorMsg);
                      reject(new Error(errorMsg));
                    }
                  },
                  fail: (err) => {
                    console.error('❌ 验证请求失败:', err);
                    let errorMsg = '验证请求失败';
                    if (err.errMsg) {
                      if (err.errMsg.includes('timeout') || err.errMsg.includes('超时')) {
                        errorMsg = '验证超时，请检查网络连接';
                      } else if (err.errMsg.includes('fail') || err.errMsg.includes('失败')) {
                        errorMsg = '网络请求失败，请检查网络连接';
                      } else {
                        errorMsg = `验证请求失败: ${err.errMsg}`;
                      }
                    } else {
                      errorMsg = '验证请求失败: 网络错误';
                    }
                    // 不在这里显示toast，让页面统一处理弹框
                    reject(new Error(errorMsg));
                  }
                });
              } catch (e) {
                console.error('解析反面图片上传响应失败:', e);
                reject(new Error('解析反面图片上传响应失败'));
              }
            },
            fail: (err) => {
              console.error('上传反面图片失败:', err);
              let errorMsg = '上传反面图片失败';
              if (err.errMsg) {
                if (err.errMsg.includes('timeout') || err.errMsg.includes('超时')) {
                  errorMsg = '上传超时，请检查网络连接';
                } else if (err.errMsg.includes('fail') || err.errMsg.includes('失败')) {
                  errorMsg = '网络请求失败，请检查网络连接';
                } else {
                  errorMsg = `上传反面图片失败: ${err.errMsg}`;
                }
              }
              uni.showToast({ title: errorMsg, icon: 'none', duration: 3000 });
              reject(new Error(errorMsg));
            }
          });
        } catch (e) {
          console.error('❌ 解析正面图片上传响应失败:', e);
          reject(new Error('解析正面图片上传响应失败，请重试'));
        }
      },
      fail: (err) => {
        console.error('❌ 上传正面图片失败:', err);
        console.error('错误详情:', JSON.stringify(err));
        let errorMsg = '上传正面图片失败';
        if (err.errMsg) {
          if (err.errMsg.includes('timeout') || err.errMsg.includes('超时')) {
            errorMsg = '上传超时，请检查网络连接';
          } else if (err.errMsg.includes('fail') || err.errMsg.includes('失败')) {
            errorMsg = '网络请求失败，请检查网络连接';
          } else {
            errorMsg = `上传正面图片失败: ${err.errMsg}`;
          }
        }
        uni.showToast({ 
          title: errorMsg, 
          icon: 'none',
          duration: 3000
        });
        reject(new Error(errorMsg));
      }
    });
  });
}

