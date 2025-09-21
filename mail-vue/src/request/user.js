import http from '@/axios/index.js'


export function userList(params) {
    return http.get('/user/list', {params: {...params}})
}

export function userSetPwd(params) {
    return http.put('/user/setPwd', params)
}

export function userSetStatus(params) {
    return http.put('/user/setStatus', params)
}

export function userSetType(params) {
    return http.put('/user/setType', params)
}


export function userDelete(userId) {
    return http.delete('/user/admin/delete', {params:{userId}})
}

export function userAdd(form) {
    return http.post('/user/add', form)
}

export function userBatchDelete(userIds, emails) {
    const data = {};
    if (userIds) data.userIds = userIds;
    if (emails) data.emails = emails;
    return http.delete('/user/admin/batchDelete', {data})
}

export function userAdminAccountAdd(form) {
    return http.post('/user/admin/account/add', form)
}

export function userAdminAccountDelete(params) {
    return http.delete('/user/admin/account/delete', {params})
}


export function userRestSendCount(userId) {
    return http.put('/user/resetSendCount', {userId})
}

export function userRestore(userId,type) {
    return http.put('/user/restore', {userId,type})
}
