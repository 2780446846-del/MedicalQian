/**
 * 地址管理API
 */
import { request } from '@/utils/request.js';

/**
 * 获取所有地址
 */
export function getAllAddresses() {
  return request({
    url: '/address',
    method: 'GET',
    showLoading: false,
    showError: false
  });
}

/**
 * 获取单个地址
 */
export function getAddressById(id) {
  return request({
    url: `/address/${id}`,
    method: 'GET',
    showLoading: false,
    showError: false
  });
}

/**
 * 创建地址
 */
export function createAddress(addressData) {
  return request({
    url: '/address',
    method: 'POST',
    data: addressData,
    showLoading: true,
    showError: true
  });
}

/**
 * 更新地址
 */
export function updateAddress(id, addressData) {
  return request({
    url: `/address/${id}`,
    method: 'PUT',
    data: addressData,
    showLoading: true,
    showError: true
  });
}

/**
 * 删除地址
 */
export function deleteAddress(id) {
  return request({
    url: `/address/${id}`,
    method: 'DELETE',
    showLoading: true,
    showError: true
  });
}

/**
 * 设置默认地址
 */
export function setDefaultAddress(id) {
  return request({
    url: `/address/${id}/set-default`,
    method: 'PUT',
    showLoading: true,
    showError: true
  });
}































