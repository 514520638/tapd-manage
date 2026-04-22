import { useState } from 'react';

const API_LIST = [
  { method: 'GET', path: '/works/:workspace_id/stories', name: '获取故事列表', desc: '获取指定工作空间下的所有故事' },
  { method: 'GET', path: '/works/:workspace_id/bugs', name: '获取Bug列表', desc: '获取指定工作空间下的所有Bug' },
  { method: 'GET', path: '/works/:workspace_id/tasks', name: '获取任务列表', desc: '获取指定工作空间下的所有任务' },
  { method: 'GET', path: '/works/:workspace_id/projects', name: '获取项目列表', desc: '获取公司下的所有项目' },
  { method: 'POST', path: '/works/:workspace_id/stories', name: '创建故事', desc: '在指定工作空间创建新故事' },
  { method: 'POST', path: '/works/:workspace_id/bugs', name: '创建Bug', desc: '在指定工作空间创建新Bug' },
];

function TapdTest() {
  const [config, setConfig] = useState({
    baseUrl: '/api',
    accessToken: '',
    companyId: '',
  });
  
  const [selectedApi, setSelectedApi] = useState(null);
  const [request, setRequest] = useState({
    method: 'GET',
    apiPath: '',
    queryParams: '',
    requestBody: '',
  });
  
  const [response, setResponse] = useState({ loading: false, data: null, error: null });

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectApi = (api) => {
    setSelectedApi(api);
    setRequest({
      method: api.method,
      apiPath: api.path,
      queryParams: api.path.includes('stories') 
        ? '{\n  "workspace_id": "你的工作空间ID",\n  "limit": 20\n}'
        : api.path.includes('bugs')
        ? '{\n  "workspace_id": "你的工作空间ID",\n  "limit": 20\n}'
        : api.path.includes('tasks')
        ? '{\n  "workspace_id": "你的工作空间ID",\n  "limit": 20\n}'
        : api.path.includes('projects')
        ? '{\n  "company_id": "公司ID"\n}'
        : '{\n  "workspace_id": "你的工作空间ID"\n}',
      requestBody: api.method === 'POST' 
        ? api.path.includes('stories') 
          ? '{\n  "name": "故事标题",\n  "description": "故事描述"\n}'
          : api.path.includes('bugs')
          ? '{\n  "title": "Bug标题",\n  "description": "Bug描述",\n  "severity": "High"\n}'
          : '{\n  "name": "任务标题",\n  "description": "任务描述"\n}'
        : '',
    });
  };

  const handleRequestChange = (field, value) => {
    setRequest(prev => ({ ...prev, [field]: value }));
  };

  const sendRequest = async () => {
    if (!config.accessToken) {
      setResponse({ loading: false, data: null, error: '请填写Access Token' });
      return;
    }
    if (!request.apiPath) {
      setResponse({ loading: false, data: null, error: '请填写API路径' });
      return;
    }

    setResponse({ loading: true, data: null, error: null });

    let url = config.baseUrl + request.apiPath;
    
    if (request.queryParams) {
      try {
        const params = JSON.parse(request.queryParams);
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          searchParams.append(key, params[key]);
        });
        url += '?' + searchParams.toString();
      } catch (e) {
        setResponse({ loading: false, data: null, error: '查询参数JSON格式错误: ' + e.message });
        return;
      }
    }

    const headers = {
      'Authorization': 'Bearer ' + config.accessToken,
      'Content-Type': 'application/json'
    };

    const options = {
      method: request.method,
      headers: headers,
    };

    if (['POST', 'PUT'].includes(request.method) && request.requestBody) {
      options.body = request.requestBody;
    }

    const startTime = Date.now();
    
    try {
      const res = await fetch(url, options);
      const duration = Date.now() - startTime;
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      setResponse({
        loading: false,
        data: { status: res.status, statusText: res.statusText, duration, data },
        error: null
      });
    } catch (error) {
      setResponse({
        loading: false,
        data: null,
        error: error.message
      });
    }
  };

  const getMethodClass = (method) => {
    return method.toLowerCase();
  };

  return (
    <div className="container">
      <h1>🔧 Tapd开放平台API测试</h1>
      
      {/* 配置区域 */}
      <div className="config-section">
        <h2>📋 接口配置</h2>
        <div className="form-group">
          <label>API地址</label>
          <input
            type="text"
            value={config.baseUrl}
            onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
            placeholder="Tapd API基础地址"
          />
        </div>
        <div className="form-group">
          <label>访问令牌 (Access Token)</label>
          <input
            type="text"
            value={config.accessToken}
            onChange={(e) => handleConfigChange('accessToken', e.target.value)}
            placeholder="输入您的Access Token"
          />
        </div>
        <div className="form-group">
          <label>公司ID (Company ID)</label>
          <input
            type="text"
            value={config.companyId}
            onChange={(e) => handleConfigChange('companyId', e.target.value)}
            placeholder="输入公司ID"
          />
        </div>
      </div>

      {/* API选择区域 */}
      <h2>📡 选择API接口</h2>
      <div className="api-list">
        {API_LIST.map((api, index) => (
          <div
            key={index}
            className={`api-card ${selectedApi === api ? 'selected' : ''}`}
            onClick={() => handleSelectApi(api)}
          >
            <h3>
              <span className={`method ${getMethodClass(api.method)}`}>{api.method}</span>
              {api.name}
            </h3>
            <p>{api.desc}</p>
          </div>
        ))}
      </div>

      {/* 请求配置 */}
      <div className="config-section">
        <h2>⚙️ 请求参数</h2>
        <div className="form-group">
          <label>请求方法</label>
          <select
            value={request.method}
            onChange={(e) => handleRequestChange('method', e.target.value)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div className="form-group">
          <label>API路径</label>
          <input
            type="text"
            value={request.apiPath}
            onChange={(e) => handleRequestChange('apiPath', e.target.value)}
            placeholder="/works/:workspace_id/stories"
          />
        </div>
        <div className="form-group">
          <label>查询参数 (JSON格式)</label>
          <textarea
            value={request.queryParams}
            onChange={(e) => handleRequestChange('queryParams', e.target.value)}
            placeholder='{"workspace_id": "123456", "limit": 20}'
          />
        </div>
        <div className="form-group">
          <label>请求体 (JSON格式，仅POST/PUT)</label>
          <textarea
            value={request.requestBody}
            onChange={(e) => handleRequestChange('requestBody', e.target.value)}
            placeholder='{"name": "故事名称", "description": "描述"}'
          />
        </div>
        <button className="btn btn-success" onClick={sendRequest} disabled={response.loading}>
          {response.loading ? '⏳ 发送中...' : '🚀 发送请求'}
        </button>
        <button className="btn" onClick={() => setResponse({ loading: false, data: null, error: null })}>
          🗑️ 清空结果
        </button>
      </div>

      {/* 结果展示 */}
      <div className="result-section">
        <h2>📊 请求结果</h2>
        <div className="result-box">
          {response.loading && <span className="info">📤 发送请求中...</span>}
          {response.error && <span className="error">❌ {response.error}</span>}
          {response.data && (
            <>
              <span className="success">📥 收到响应</span>
              {'\n'}
              <span className="info">状态码: {response.data.status} {response.data.statusText}</span>
              {'\n'}
              <span className="info">响应时间: {response.data.duration}ms</span>
              {'\n\n'}
              <span className="info">响应体:</span>
              {'\n'}
              {typeof response.data.data === 'object' 
                ? JSON.stringify(response.data.data, null, 2)
                : response.data.data}
            </>
          )}
          {!response.loading && !response.data && !response.error && '等待发送请求...'}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="config-section">
        <h2>📖 使用说明</h2>
        <ol style={{ color: '#666', lineHeight: '1.8' }}>
          <li>前往 <a href="https://dev.tapd.cn/" target="_blank" rel="noopener noreferrer">Tapd开放平台</a> 注册应用获取 Access Token</li>
          <li>填写上方配置区域的API地址和访问令牌</li>
          <li>从API列表中选择要测试的接口，或手动输入API路径</li>
          <li>根据需要填写查询参数和请求体</li>
          <li>点击"发送请求"按钮查看结果</li>
        </ol>
      </div>
    </div>
  );
}

export default TapdTest;
