/**
 * Tapd Skill - 封装 Tapd 开放平台 API 业务逻辑
 * 
 * 基于 src/api/index.js 逻辑重构，支持 openclaw 定时任务执行
 * 
 * 使用说明：
 * 1. 在 OpenClaw 中配置 skill 时，需要用户提供 USER_TOKEN（必填）
 * 2. 调用示例：
 *    import { createTapdApi } from './tapd-skill';
 *    const tapd = createTapdApi('your-user-token');
 *    const userinfo = await tapd.getUserInfo();
 * 3. 直接运行（Node.js 环境）：
 *    TAPD_USER_TOKEN=xxx node tapd-skill/index.js
 */

import axios from 'axios';

// 配置常量
const TAPD_SIZE = 11;
const EMUN_WORKITEM_ENGLISH_NAME = ['story', 'Task', 'LOG']
const LOG_WORKITEM_TYPE_ID = '1149782315001000496';
const WORKSPACE_ID = '49782315';

const DEWSCRIPTION = "<div class=\"tox-clear-float\"><table border=\"1\" style=\"border-collapse: collapse; border-width: 1px; border-color: #ced4d9; width: 658px; height: 84px;\"><tbody><tr style=\"height: 28px;\"><td style=\"width: 145px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><strong><span style=\"font-family: 'PingFang SC'; color: #171a1d;\">今日工作内容及产出</span><span style=\"font-family: 'PingFang SC'; color: #171a1d;\">：</span></strong></td><td style=\"width: 282px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><br></td></tr><tr style=\"height: 28px;\"><td style=\"width: 145px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 456; color: #171a1d;\">遇到的问题</span><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 200; color: #171a1d;\">：</span></td><td style=\"width: 282px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><br></td></tr><tr style=\"height: 28px;\"><td style=\"width: 145px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 456; color: #171a1d;\">明日工作计划</span><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 200; color: #171a1d;\">：</span></td><td style=\"width: 282px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><br></td></tr></tbody></table></div><p>&nbsp;</p><p><br></p>"

/**
 * 创建 Tapd API 实例
 * @param {string} USER_TOKEN - 用户的 OAuth Access Token（必填）
 * @returns {object} Tapd API 操作对象
 */
export const createTapdApi = (USER_TOKEN) => {
    if (!USER_TOKEN) {
        throw new Error('USER_TOKEN 是必填参数，请从 Tapd 开放平台获取你的 Access Token');
    }

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

    // ========== API 方法 ==========

    // 获取用户信息
    const getUserInfo = async () => {
        return api.get('/users/info');
    };

    // 获取工单类型
    const getWorkTypeList = async (workspace_id) => {
        return api.get('/workitem_types', {
            params: { workspace_id }
        });
    };

    // 获取用户空间信息（工作空间ID）
    const getUserWorkspace = () => {
        return WORKSPACE_ID;
    };

    // 获取用户Story列表 - 与原逻辑一致
    const getUserStoryList = async (workspace_id, workTypeId) => {
        const result = await api.get('/user_oauth/get_user_todo_story', {
            params: { workspace_id }
        });
        const storyListPromise = result.filter(item => item.Story.workitem_type_id === workTypeId).map(async items => {
            let item = items.Story
            const storyNum = await getStoryNumber(workspace_id, item.id)
            return {
                id: item.id,
                name: item.name,
                story_num: storyNum.count,
                average_score: item.business_value / (storyNum.count || 0.1),  // 与原逻辑一致
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
    const getStoryNumber = async (workspace_id, parent_id = null) => {
        return api.get('/stories/count', {
            params: { workspace_id, parent_id }
        });
    };

    // 创建log
    const postCreateLog = async (workspace_id, targetStory) => {
        return api.post('/stories', {
            workspace_id,
            name: targetStory.name,
            creator: targetStory.creator,
            priority_label: targetStory.priority,
            size: TAPD_SIZE,
            owner: targetStory.creator,
            business_value: targetStory.business_value,
            parent_id: targetStory.id,
            workitem_type_id: LOG_WORKITEM_TYPE_ID,
            iteration_id: targetStory.iteration_id,
            description: DEWSCRIPTION,
        });
    };

    // 更新Log
    const postRenewLog = async (workspace_id, targetStory) => {
        return api.post('/stories', {
            workspace_id,
            name: targetStory.name,
            creator: targetStory.creator,
            priority_label: targetStory.priority,
            size: TAPD_SIZE,
            owner: targetStory.creator,
            business_value: targetStory.business_value,
            id: targetStory.id,
            workitem_type_id: LOG_WORKITEM_TYPE_ID,
            iteration_id: targetStory.iteration_id,
            description: DEWSCRIPTION,
            status: 'status_8'
        });
    };

    // 自动创建日志 - 核心业务逻辑
    const autoLog = async () => {
        const userinfoPromise = getUserInfo()
        const userWorkspacePromise = Promise.resolve(getUserWorkspace())
        const [userinfo, userWorkspace] = await Promise.all([userinfoPromise, userWorkspacePromise])
        const workTypeList = await getWorkTypeList(userWorkspace)
        const taskWorkTypeId = workTypeList.find(item => item.WorkitemType.english_name === EMUN_WORKITEM_ENGLISH_NAME[1]).WorkitemType.id

        const userTaskList = (await getUserStoryList(userWorkspace, taskWorkTypeId))
        const bestTask = userTaskList.reduce((prev, curr) => {
            return prev.average_score > curr.average_score ? prev : curr
        })
        const resultLog = await postCreateLog(userWorkspace, bestTask)
        const editLogResult = await postRenewLog(userWorkspace, resultLog.Story)
        const resultUrl = `https://www.tapd.cn/tapd_fe/my/work?workitem_type_id=${taskWorkTypeId}&dialog_preview_id=story_${editLogResult.Story.id}`
        
        return { resultLog, editLogResult, resultUrl }
    };

    // 自动创建日志（指定任务）- 用于定时任务执行
    const autoLogWithTask = async (taskId) => {
        const userinfoPromise = getUserInfo()
        const userWorkspacePromise = Promise.resolve(getUserWorkspace())
        const [userinfo, userWorkspace] = await Promise.all([userinfoPromise, userWorkspacePromise])
        const workTypeList = await getWorkTypeList(userWorkspace)
        const taskWorkTypeId = workTypeList.find(item => item.WorkitemType.english_name === EMUN_WORKITEM_ENGLISH_NAME[1]).WorkitemType.id

        const userTaskList = (await getUserStoryList(userWorkspace, taskWorkTypeId))
        const targetTask = taskId 
            ? userTaskList.find(item => item.id === taskId)
            : userTaskList.reduce((prev, curr) => {
                return prev.average_score > curr.average_score ? prev : curr
            })
        
        if (!targetTask) {
            throw new Error('未找到指定的任务或用户没有任务');
        }
        
        const resultLog = await postCreateLog(userWorkspace, targetTask)
        const editLogResult = await postRenewLog(userWorkspace, resultLog.Story)
        const resultUrl = `https://www.tapd.cn/tapd_fe/my/work?workitem_type_id=${taskWorkTypeId}&dialog_preview_id=story_${editLogResult.Story.id}`
        
        return { resultLog, editLogResult, resultUrl }
    };

    return {
        getUserInfo,
        getWorkTypeList,
        getUserWorkspace,
        getUserStoryList,
        getStoryNumber,
        postCreateLog,
        postRenewLog,
        autoLog,
        autoLogWithTask,
    };
};

// ========== Skill 说明文档 ==========
export const SKILL_CONFIG = {
    name: 'Tapd',
    description: 'TAPD 开放平台 API 封装，支持获取用户信息、工单列表、自动创建日志等功能',
    parameters: [
        {
            name: 'USER_TOKEN',
            type: 'string',
            required: true,
            description: '你的 Tapd OAuth Access Token，从 Tapd 开放平台获取（必填）'
        }
    ],
    methods: [
        { name: 'getUserInfo', description: '获取当前用户信息' },
        { name: 'getUserWorkspace', description: '获取用户工作空间ID' },
        { name: 'getWorkTypeList', description: '获取工单类型列表', params: ['workspace_id'] },
        { name: 'getUserStoryList', description: '获取用户的 Story 列表', params: ['workspace_id', 'workTypeId'] },
        { name: 'autoLog', description: '自动创建日志（核心业务逻辑）' },
        { name: 'autoLogWithTask', description: '自动创建日志（指定任务ID）', params: ['taskId（可选）'] },
    ]
};

// ========== 定时任务入口 ==========
// 直接运行脚本时自动执行 autoLog
const runAsCLI = async () => {
    const isCLI = require.main === module;
    
    if (isCLI) {
        console.log('========================================');
        console.log('TAPD 自动创建日志技能');
        console.log('========================================\n');
        
        // 从环境变量获取 USER_TOKEN
        const userToken = process.env.TAPD_USER_TOKEN;
        if (!userToken) {
            console.error('❌ 错误：请设置 TAPD_USER_TOKEN 环境变量');
            console.error('   示例：TAPD_USER_TOKEN=xxx node tapd-skill/index.js');
            process.exit(1);
        }
        
        try {
            const tapd = createTapdApi(userToken);
            const result = await tapd.autoLog();
            console.log('\n========================================');
            console.log('✅ 执行成功');
            console.log('🔗 链接:', result.resultUrl);
            console.log('========================================');
        } catch (error) {
            console.error('❌ 执行失败:', error.message);
            process.exit(1);
        }
    }
};

// 执行 CLI 入口
runAsCLI();

export default createTapdApi;
