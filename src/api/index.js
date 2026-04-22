import axios from 'axios';

// 配置常量
const user_id = '912650487';
const workspace_id = '49782315';
const company_id = '20025941';
const token = '89497d105df2e06784603377d0ac4564c682296b';

// 创建 axios 实例
const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求拦截器 - 自动添加 token
api.interceptors.request.use(
    (config) => {
        config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器 - 统一处理错误
api.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
    }
);

// 获取用户信息
export const getUserInfo = async () => {
    try {
        const result = await api.get('/users/info');
        console.log('userInfo', result);
        return result;
    } catch (error) {
        console.error('getUserInfo error:', error);
        throw error;
    }
};
getUserInfo()

// 获取用户空间信息
export const getUserWorkspace = async () => {
    try {
        const result = await api.get('/workspaces/get_mini_project_list_with_permission', {
            params: { user: user_id, company_id: company_id },
        });
        console.log('getUserWorkspace', result);
        return result;
    } catch (error) {
        console.error('getUserWorkspace error:', error);
        throw error;
    }
};
getUserWorkspace()

// // 获取用户项目信息
// export const getUserWorkspace = async () => {
//     try {
//         const result = await api.get('/workspace/workspaces/get_all_my_projects');
//         console.log('getUserWorkspace', result);
//         return result;
//     } catch (error) {
//         console.error('getUserWorkspace error:', error);
//         throw error;
//     }
// };
// getUserWorkspace()


// 获取用户Story列表
export const getUserStory = async () => {
    try {
        const result = await api.get('/user_oauth/get_user_todo_story', {
            params: { workspace_id }
        });
        console.log('userStory', result);
        return result;
    } catch (error) {
        console.error('getUserStory error:', error);
        throw error;
    }
};
getUserStory()

// 获取用户Task列表
export const getUserTask = async () => {
    try {
        const result = await api.get('/user_oauth/get_user_todo_task', {
            params: { workspace_id }
        });
        console.log('userTask', result);
        return result;
    } catch (error) {
        console.error('getUserTask error:', error);
        throw error;
    }
};
getUserTask()




// 导出 api 实例供外部使用
export default api;