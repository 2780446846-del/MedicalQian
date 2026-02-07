'use strict'

const parsePayload = (event = {}) => {
	if (event.body) {
		try {
			return JSON.parse(event.body)
		} catch (error) {
			console.warn('failed to parse body JSON', error)
		}
	}
	if (event.queryStringParameters && Object.keys(event.queryStringParameters).length) {
		return event.queryStringParameters
	}
	return event
}

exports.main = async (event, context) => {
	const payload = parsePayload(event)
	console.log('[testLogin] event payload:', payload)

	const { access_token, openid } = payload || {}
	if (!access_token || !openid) {
		return {
			code: 422,
			success: false,
			message: 'access_token 或 openid 缺失，无法获取手机号',
		}
	}

	const res = await uniCloud.getPhoneNumber({
		appid: '__UNI__E3E33C6',
		provider: 'univerify',
		access_token,
		openid,
	})

	const phoneNumber = res?.data?.phoneNumber || res?.phoneNumber
	if (!phoneNumber) {
		return {
			code: 500,
			success: false,
			message: 'uniCloud.getPhoneNumber 未返回手机号',
			data: res,
		}
	}

	return {
		code: 0,
		success: true,
		message: '获取手机号成功',
		data: {
			phoneNumber,
			provider: 'univerify',
			raw: res,
		},
	}
}
