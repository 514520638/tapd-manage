#!/usr/bin/env node

/**
 * TAPD 自动挂Log脚本
 * 用于每日自动在TAPD平台上创建日志任务
 * 
 * 使用方法:
 *   node scripts/tapd-auto-log.js
 * 
 * 首次运行会要求输入USER_TOKEN，后续运行会自动读取保存的TOKEN
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, '..', 'tapd-config.json');

// API配置
const TAPD_SIZE = 11;
const EMUN_WORKITEM_ENGLISH_NAME = ['story', 'Task', 'LOG'];
const DEWSCRIPTION = "<div class=\"tox-clear-float\"><table border=\"1\" style=\"border-collapse: collapse; border-width: 1px; border-color: #ced4d9; width: 658px; height: 84px;\"><tbody><tr style=\"height: 28px;\"><td style=\"width: 145px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><strong><span style=\"font-family: 'PingFang SC'; color: #171a1d;\">今日工作内容及产出</span><span style=\"font-family: 'PingFang SC'; color: #171a1d;\">：</span></strong></td><td style=\"width: 282px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><br></td></tr><tr style=\"height: 28px;\"><td style=\"width: 145px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 456; color: #171a1d;\">遇到的问题</span><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 200; color: #171a1d;\">：</span></td><td style=\"width: 282px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><br></td></tr><tr style=\"height: 28px;\"><td style=\"width: 145px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 456; color: #171a1d;\">明日工作计划</span><span style=\"font-family: 'PingFang SC'; font-size: 14px; font-weight: 200; color: #171a1d;\">：</span></td><td style=\"width: 282px; border-width: 1px; padding: 4px; border-color: #ced4d9; height: 28px;\"><br></td></tr></tbody></table></div><p>&nbsp;</p><p><br></p>";

// TAPD API基础URL
const BASE_URL = 'https://api.tapd.cn';

// 创建axios实例
const createApi = (userToken) => {
    return axios.create({
        baseURL: BASE_URL,
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        }
    });
};

// 读取配置
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('读取配置文件失败:', error.message);
    }
    return null;
}

// 保存配置
function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
        console.log('配置已保存到:', CONFIG_PATH);
    } catch (error) {
        console.error('保存配置文件失败:', error.message);
        process.exit(1);
    }
}

// 询问用户输入
function askQuestion(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// 获取用户Token
async function getUserToken() {
    let config = loadConfig();
    
    if (config && config.USER_TOKEN) {
        console.log('✓ 已找到保存的USER_TOKEN');
        return config.USER_TOKEN;
    }
    
    console.log('\n========================================');
    console.log('首次运行：需要配置USER_TOKEN');
    console.log('========================================');
    console.log('\n请先前往 TAPD开放平台 获取您的USER_TOKEN:');
    console.log('  https://dev.tapd.cn/');
    console.log('\n登录后，在"我的应用"中创建应用或查看已有应用的访问令牌\n');
    
    const token = await askQuestion('请输入您的USER_TOKEN: ');
    
    if (!token || token.trim() === '') {
        console.error('错误: USER_TOKEN不能为空');
        process.exit(1);
    }
    
    const trimmedToken = token.trim();
    
    // 保存配置
    config = { USER_TOKEN: trimmedToken };
    saveConfig(config);
    
    console.log('✓ USER_TOKEN配置成功！\n');
    
    return trimmedToken;
}

// 获取用户信息
async function getUserInfo(api) {
    const response = await api.get('/users/info');
    return response.data.data;
}

// 获取工单类型
async function getWorkTypeList(api, workspace_id) {
    const response = await api.get('/workitem_types', {
        params: { workspace_id }
    });
    return response.data.data;
}

// 获取用户工作空间
async function getUserWorkspace(api) {
    // 这里返回默认的工作空间ID，实际可能需要根据用户信息获取
    return '49782315';
}

// 获取用户Story列表
async function getUserStoryList(api, workspace_id, workTypeId) {
    const response = await api.get('/user_oauth/get_user_todo_story', {
        params: { workspace_id }
    });
    
    const result = response.data.data;
    const storyListPromise = result
        .filter(item => item.Story.workitem_type_id === workTypeId)
        .map(async items => {
            let item = items.Story;
            const storyNum = await getStoryNumber(api, workspace_id, item.id);
            return {
                id: item.id,
                name: item.name,
                story_num: storyNum.count,
                average_score: item.business_value / (storyNum.count || 0.1),
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
            };
        });
    
    return Promise.all(storyListPromise);
}

// 获取需求数量
async function getStoryNumber(api, workspace_id, parent_id = null) {
    const response = await api.get('/stories/count', {
        params: { workspace_id, parent_id }
    });
    return response.data.data;
}

// 创建log
async function postCreateLog(api, workspace_id, targetStory) {
    const response = await api.post('/stories', {
        workspace_id,
        name: targetStory.name,
        creator: targetStory.creator,
        priority_label: targetStory.priority,
        size: TAPD_SIZE,
        owner: targetStory.creator,
        business_value: targetStory.business_value,
        parent_id: targetStory.id,
        workitem_type_id: '1149782315001000496',
        iteration_id: targetStory.iteration_id,
        description: DEWSCRIPTION,
    });
    return response.data.data;
}

// 更新Log
async function postRenewLog(api, workspace_id, targetStory) {
    const response = await api.post('/stories', {
        workspace_id,
        name: targetStory.name,
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
    });
    return response.data.data;
}

// 主函数 - 自动挂Log
async function autoLog() {
    console.log('\n========================================');
    console.log('   TAPD 自动挂Log工具');
    console.log('========================================\n');
    
    // 获取用户Token
    const userToken = await getUserToken();
    
    // 创建API实例
    const api = createApi(userToken);
    
    console.log('开始执行自动挂Log...\n');
    
    try {
        // 获取用户信息和工作空间
        console.log('1. 获取用户信息...');
        const userinfo = await getUserInfo(api);
        console.log(`   ✓ 用户: ${userinfo ? userinfo.name : '未知'}`);
        
        // 获取工作空间
        console.log('2. 获取工作空间...');
        const userWorkspace = await getUserWorkspace(api);
        console.log(`   ✓ 工作空间ID: ${userWorkspace}`);
        
        // 获取工单类型
        console.log('3. 获取工单类型...');
        const workTypeList = await getWorkTypeList(api, userWorkspace);
        const taskWorkType = workTypeList.find(item => item.WorkitemType.english_name === EMUN_WORKITEM_ENGLISH_NAME[1]);
        
        if (!taskWorkType) {
            throw new Error('未找到Task类型的工单');
        }
        
        const taskWorkTypeId = taskWorkType.WorkitemType.id;
        console.log(`   ✓ Task类型ID: ${taskWorkTypeId}`);
        
        // 获取用户任务列表
        console.log('4. 获取用户任务列表...');
        const userTaskList = await getUserStoryList(api, userWorkspace, taskWorkTypeId);
        console.log(`   ✓ 找到 ${userTaskList.length} 个任务`);
        
        if (userTaskList.length === 0) {
            throw new Error('没有找到任何任务，请确保您有可用的Task');
        }
        
        // 选择最佳任务（根据平均分）
        const bestTask = userTaskList.reduce((prev, curr) => {
            return prev.average_score > curr.average_score ? prev : curr;
        });
        
        console.log(`   ✓ 选择了任务: ${bestTask.name} (评分: ${bestTask.average_score.toFixed(2)})`);
        
        // 创建Log
        console.log('5. 创建Log...');
        const resultLog = await postCreateLog(api, userWorkspace, bestTask);
        console.log(`   ✓ Log创建成功, ID: ${resultLog.Story.id}`);
        
        // 更新Log
        console.log('6. 更新Log状态...');
        const editLogResult = await postRenewLog(api, userWorkspace, resultLog.Story);
        console.log(`   ✓ Log更新成功, ID: ${editLogResult.Story.id}`);
        
        // 生成结果URL
        const resultUrl = `https://www.tapd.cn/tapd_fe/my/work?workitem_type_id=${taskWorkTypeId}&dialog_preview_id=story_${editLogResult.Story.id}`;
        
        console.log('\n========================================');
        console.log('   执行成功！');
        console.log('========================================');
        console.log(`\n📋 Log链接: ${resultUrl}\n`);
        
        // 自动打开浏览器
        console.log('正在打开浏览器...');
        require('child_process').exec(`open "${resultUrl}"`);
        
    } catch (error) {
        console.error('\n❌ 执行失败:', error.message);
        if (error.response) {
            console.error('   错误详情:', error.response.data);
        }
        process.exit(1);
    }
}

// 运行主函数
autoLog();
