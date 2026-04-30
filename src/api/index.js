import axios from 'axios';

// 配置常量
const USER_TOKEN = '89497d105df2e06784603377d0ac4564c682296b';
const TAPD_SIZE = 11;
const EMUN_WORKITEM_ENGLISH_NAME = ['story', 'Task', 'LOG']
const DEWSCRIPTION = "<div class=\"tox-clear-float\"><table border=\"1\" style=\"border-collapse: collapse; border-width: 1px; border-color: #ced4d9; width: 658px; height: 84px;\"><tbody><tr style=\"height: 28px;\"><td style=\"width: 145px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><strong><span style=\"font-family: 'PingFang SC'; color: #171a1d;\">今日工作内容及产出</span><span style=\"font-family: 'PingFang SC'; color: #171a1d;\">：</span></strong></td><td style=\"width: 282px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><br></td></tr><tr style=\"height: 28px;\"><td style=\"width: 145px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 456; color: #171a1d;\">遇到的问题</span><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 200; color: #171a1d;\">：</span></td><td style=\"width: 282px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><br></td></tr><tr style=\"height: 28px;\"><td style=\"width: 145px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 456; color: #171a1d;\">明日工作计划</span><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 200; color: #171a1d;\">：</span></td><td style=\"width: 282px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><br></td></tr></tbody></table></div><p>&nbsp;</p><p><br></p>"

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
        config.headers.Authorization = `Bearer ${USER_TOKEN}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器 - 统一处理错误
api.interceptors.response.use(
    (response) => {
        return response.data.data;
    },
    (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
    }
);

// 获取用户信息
export const getUserInfo = async () => {
    return api.get('/users/info');
};

// 获取工单类型
export const getWorkTypeList = async (workspace_id) => {
    const result = api.get('/workitem_types', {
        params: { workspace_id }
    });
    return result;
};

// 获取用户空间信息 - 使用 Basic Auth
export const getUserWorkspace = async () => {
    // const credentials = btoa(`${api_user}:${api_password}`);
    // const result = await axios.get('/api/workspaces/get_mini_project_list_with_permission', {
    //     params: { company_id: company_id, user: '唐志坚' },
    //     headers: {
    //         'Authorization': `Basic ${credentials}`,
    //         'Content-Type': 'application/json'
    //     }
    // });
    // console.log('getUserWorkspace', result.data);
    return '49782315';
};


// 获取用户Story列表
export const getUserStoryList = async (workspace_id, workTypeId) => {
    const result = await api.get('/user_oauth/get_user_todo_story', {
        params: {
            workspace_id,
        }
    });
    const storyListPromise = result.filter(item => item.Story.workitem_type_id === workTypeId).map(async items => {
        let item = items.Story
        const storyNum = await getStoryNumber(workspace_id, item.id)
        return {
            id: item.id,
            name: item.name,
            story_num: storyNum.count,
            average_score: item.business_value / storyNum.count,
            status: item.status,
            priority: item.priority,
            description: item.description,
            created: item.created,
            business_value: item.business_value,
            iteration_id: item.iteration_id,
            level: item.level,
            parent_id: item.parent_id,
            workitem_type_id: item.workitem_type_id,
            creator: item.creator,
            children_id: item.children_id,
        }
    })
    return await Promise.all(storyListPromise)
};


// 获取需求数量
export const getStoryNumber = async (workspace_id, parent_id = null) => {
    return api.get('/stories/count', {
        params: {
            workspace_id,
            parent_id,
        }
    });;
};

// 创建log
export const postCreateLog = async (workspace_id, targetStory) => {
    return api.post('/stories', {
        workspace_id,
        name: `【test】${targetStory.name}`,
        creator: targetStory.creator,
        priority_label: targetStory.priority,
        size: TAPD_SIZE,
        owner: targetStory.creator,
        business_value: targetStory.business_value,
        parent_id: targetStory.id,
        workitem_type_id: '1149782315001000496',
        iteration_id: targetStory.iteration_id,
        description: DEWSCRIPTION,
    });;
};

// 更新Log
export const postRenewLog = async (workspace_id, targetStory) => {
    return api.post('/stories', {
        workspace_id,
        name: `【test】${targetStory.name}`,
        creator: targetStory.creator,
        priority_label: targetStory.priority,
        size: TAPD_SIZE,
        owner: targetStory.creator,
        business_value: targetStory.business_value,
        id: targetStory.id,
        workitem_type_id: '1149782315001000496',
        iteration_id: targetStory.iteration_id,
        description: DEWSCRIPTION,
        status: 'status_8'
    });;
};


export const autoLog = async () => {
    const userinfoPromise = getUserInfo()
    const userWorkspacePromise = getUserWorkspace()
    const [userinfo, userWorkspace] = await Promise.all([userinfoPromise, userWorkspacePromise])
    const workTypeList = await getWorkTypeList(userWorkspace)
    const taskWorkTypeId = workTypeList.find(item => item.WorkitemType.english_name === EMUN_WORKITEM_ENGLISH_NAME[1]).WorkitemType.id


    const userTaskList = (await getUserStoryList(userWorkspace, taskWorkTypeId))
    const bestTask = userTaskList.reduce((prev, curr) => {
        return prev.average_score > curr.average_score ? prev : curr
    })
    const testTask = userTaskList.find(item => item.id == '1149782315001164939')
    const resultLog = await postCreateLog(userWorkspace, testTask)
    const editLogResult = await postRenewLog(userWorkspace, resultLog.Story)
    const resultUrl = `https://www.tapd.cn/tapd_fe/my/work?workitem_type_id=${taskWorkTypeId}&dialog_preview_id=story_${editLogResult.Story.id}`
    window.open(resultUrl)
    console.log(11112, resultLog, resultUrl, editLogResult);
};
await autoLog()




// 导出 api 实例供外部使用
export default api;