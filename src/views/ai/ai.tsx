import { useCallback, useRef, useState } from "react";
import "./AiAgentPage.css";
import { AlertType } from "src/components/shared/Alert/alert.type";
import { useNavigate } from "react-router";
import axios from 'axios';
import BoltIcon from '@mui/icons-material/StopCircleSharp';
import { uniqueId } from "lodash";
import { FunctionCallResultType, SelectedFileType } from "./ai.types";
import server from "../../assets/address.json"




const conversations = [
    "Role management",
    "User management",
    "Permissions",
];

function AiAgentPage() {

    //#region-------------------- Constants---------------
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef<any>(null);
    const recognitionRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    //#endregion----------------- Constants---------------


    //#region-------------------- States---------------

    const [prompt, setPrompt] = useState("");
    const [selectedFile, setSelectedFile] = useState<SelectedFileType[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [showWorkspace, setShowWorkspace] = useState(false);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [voiceInput, setVoiceInput] = useState('');
    const [alert, setAlert] = useState<AlertType>({
        alertMessage: "",
        severity: "info",
        onClose: () => { }
    })
    const [history, setHistory] = useState<FunctionCallResultType[]>([])
    //#endregion----------------- States ---------------


    //#region-------------------- Handlers ---------------

    const handleFileChange = async (event: any) => {
        const file = event.target.files?.[0];
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {

            setAlert({
                alertMessage: "Lütfen önce giriş yapın.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
            navigate('/');
            return;
        }

        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const uploadResponse = await axios.post(
                    server.baseurl + server.baseinfo + "upload-files",
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }
                );

                if (uploadResponse.data.httpStatusCode === 201) {
                    setSelectedFile([...selectedFile, { file, path: uploadResponse.data.data.files }]);
                } else {
                    return null;
                }
            } catch (e: any) {
                return null;
            }

        }









    };

    const handleSubmit = useCallback(async () => {
        if (!voiceInput.trim()) {
            // setAlert({ alertMessage: "Lütfen bir metin girin.", severity: 'error', onClose: () => { setAlert({ ...alert, alertMessage: "" }) } });
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {

            setAlert({
                alertMessage: "Lütfen önce giriş yapın.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
            navigate('/');
            return;
        }

        try {
            setLoadingButton(true);

            const response = await axios.post(
                'http://localhost:3001/api/baseinfo/agent',
                {
                    prompt: voiceInput,
                    files: selectedFile.map((file) => file.path)
                },
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 200 || response.status === 201) {

                if (response.data.data.result === "success") {
                    setHistory([...history, {
                        id: uniqueId(),
                        list: response.data.data.list,
                        message: response.data.data.message,
                        result: response.data.data.result,
                        time: `${new Date().getHours().toString()}:${new Date().getMinutes().toString()}`
                    }])
                    setVoiceInput('');
                    setSelectedFile([]);

                }
                else {
                    setHistory([...history, {
                        id: uniqueId(),
                        list: response.data.data.list,
                        message: response.data.data.message,
                        result: response.data.data.result,
                        time: `${new Date().getHours().toString()}:${new Date().getMinutes().toString()}`
                    }])
                }



            }
        } catch (error: any) {
            if (error.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate('/');
                setAlert({
                    alertMessage: "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.",
                    severity: "error",
                    onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
                })
            } else {
                setAlert({
                    alertMessage: error.response?.data?.message || "Mesaj gönderiminde hata oluştu.",
                    severity: "error",
                    onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
                })
            }
        } finally {
            setLoadingButton(false);
        }
    }, [voiceInput, alert, navigate,selectedFile]);


    const toggleRecording = () => {
        setIsRecording((current) => !current);
    };

    //#endregion----------------- Handlers---------------

    //#region-------------------- Functions ---------------
    const removeFile = (index: number) => {
        setSelectedFile((prev) => prev.filter((_, i) => i !== index));

    };
    //#endregion----------------- Functions---------------







    return (
        <div className="agent-page">
            {/* Sidebar */}

            {/* {
                alert.alertMessage!=""&&<Alert {...alert}/>
            } */}
            <aside className="agent-sidebar">
                <div className="sidebar-header">
                    <div className="brand">
                        <div className="brand-icon">AI</div>

                        <div>
                            <strong>AI Agent</strong>
                            <span>Workspace</span>
                        </div>
                    </div>

                    <button className="new-chat-button">
                        <span>+</span>
                        New Chat
                    </button>
                </div>

                <div className="conversation-section">
                    <div className="section-label">TODAY</div>

                    {conversations.map((conversation, index) => (
                        <button
                            key={conversation}
                            className={`conversation-item ${index === 0 ? "active" : ""
                                }`}
                        >
                            <span className="conversation-icon">◈</span>

                            <span>{conversation}</span>
                        </button>
                    ))}
                </div>

                <div className="sidebar-footer">
                    <div className="agent-status">
                        <span className="status-dot" />

                        <div>
                            <strong>Agent online</strong>
                            <span>Ready to execute</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="agent-main">
                {/* Header */}
                {/* <header className="agent-header">
                    <div>
                        <div className="mobile-brand">
                            <div className="brand-icon">AI</div>

                            <strong>AI Agent</strong>
                        </div>

                        <LogoDarkRTL />
                    </div>

                    <div className="header-user">
                        <div className="header-user-info">
                            <strong>Hamed</strong>
                            <span>Administrator</span>
                        </div>

                        <div className="avatar">H</div>
                    </div>
                </header> */}

                {/* Workspace */}
                <div className="workspace">
                    {/* Conversation */}
                    {/* <section className="conversation-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">CONVERSATION</span>
                <h2>Role management</h2>
              </div>

              <span className="live-badge">
                <span />
                Live
              </span>
            </div>

            <div className="messages">
              <UserMessage>
                Vekil rolünü oluştur.
              </UserMessage>

              <AgentMessage>
                <div className="agent-thinking">
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                </div>

                <p>
                  Rol oluşturuluyor...
                </p>
              </AgentMessage>

              <AgentMessage success>
                <div className="success-header">
                  <div className="success-icon">✓</div>

                  <div>
                    <strong>Rol başarıyla oluşturuldu.</strong>

                    <span>
                      create_role işlemi tamamlandı.
                    </span>
                  </div>
                </div>

                <div className="mini-result">
                  <span>Role</span>
                  <strong>Vekil</strong>
                </div>
              </AgentMessage>
            </div>

          </section> */}

                    {/* Result Workspace */}
                    <section
                        className={`result-panel ${showWorkspace ? "show-mobile" : ""
                            }`}
                    >
                        <div className="result-header">
                            <div>
                                <span className="eyebrow">
                                    ÇALIŞMA ALANI
                                </span>

                                <h2>İşlem sonucu</h2>
                            </div>

                            {/* <button
                className="close-mobile-workspace"
                onClick={() => setShowWorkspace(false)}
              >
                ×
              </button> */}
                        </div>



                        {history.map((item) => (
                            <div className="operation-card" key={item.id}>
                                <div className="operation-top">
                                    <div className={`${item.result == "success" ? "operation-success" : "operation-error"}`}>
                                        <span>{item.result == "success" ? "✓" : "x"}</span>
                                    </div>

                                    <div style={{ flex: "1", minWidth: 0, overflow: "hidden", overflowWrap: "break-word" }}>
                                        <strong style={{ overflow: "hidden", flex: "1", textWrap: "nowrap", textOverflow: "ellipsis" }}>
                                            {item.message}
                                        </strong>

                                        <span>
                                            {item.time}
                                        </span>
                                    </div>

                                    <span className={`${item.result == "success" ? "success-pill" : "error-pill"}`}>
                                        {item.result == "success" ? "Başarı" : "Hata"}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Roles */}
                        {/* <div className="data-section">
              <div className="data-section-header">
                <div>
                  <h3>Roles</h3>

                  <span>
                    Current system data
                  </span>
                </div>

                <button className="refresh-button">
                  ↻
                </button>
              </div>

              <div className="search-box">
                <span>⌕</span>

                <input
                  placeholder="Search roles..."
                />
              </div>

              <div className="roles-table-wrapper">
                <table className="roles-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.id}>
                        <td>
                          <div className="table-role">
                            <div>
                              {role.name.charAt(0)}
                            </div>

                            <strong>
                              {role.name}
                            </strong>
                          </div>
                        </td>

                        <td>
                          <span className="table-status">
                            <i />
                            {role.status}
                          </span>
                        </td>

                        <td>
                          <button className="more-button">
                            ···
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="view-all">
                View all roles →
              </button>
            </div> */}


                        <div className="composer-container">

                            <div className="file-container">
                                {selectedFile.map((item, index) =>
                                    <div className="attachment">
                                        <div className="attachment-icon">
                                            📎
                                        </div>

                                        <div className="attachment-info">
                                            <strong>{item?.file.name}</strong>

                                            <span>
                                                {(item?.file.size / 1024).toFixed(1)} KB
                                            </span>
                                        </div>

                                        <button onClick={() => removeFile(index)}>
                                            ×
                                        </button>
                                    </div>
                                )}

                            </div>


                            {isRecording && (
                                <div className="recording">
                                    <div className="recording-indicator">
                                        <span />
                                        Recording...
                                    </div>

                                    <div className="wave">
                                        {Array.from({ length: 28 }).map((_, index) => (
                                            <i
                                                key={index}
                                                style={{
                                                    height: `${12 + Math.random() * 25}px`,
                                                }}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        className="stop-recording"
                                        onClick={toggleRecording}
                                    >
                                        Stop
                                    </button>
                                </div>
                            )}

                            <div className="composer">
                                <button
                                    className="composer-button"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Attach file"
                                >
                                    📎
                                </button>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    hidden
                                    onChange={handleFileChange}
                                />

                                <textarea
                                    value={voiceInput}
                                    onChange={(event) =>
                                        //setPrompt(event.target.value)
                                        setVoiceInput(event.target.value)
                                    }
                                    placeholder="Temsilcinize sorun..."
                                    rows={1}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" &&
                                            !event.shiftKey
                                        ) {
                                            event.preventDefault();
                                            handleSubmit();
                                        }
                                    }}
                                />

                                <button
                                    className={`composer-button ${isRecording ? "recording-button" : ""
                                        }`}
                                    onClick={toggleRecording}
                                    title="Voice input"
                                >
                                    🎤
                                </button>

                                <button
                                    className={`send-button ${!voiceInput.trim() ? "inactive" : ""}`}
                                    onClick={handleSubmit}
                                >
                                    {loadingButton ? <BoltIcon className="waiting-request-response" color="inherit" sx={{ mr: 1, fontSize: 20 }} /> : "↑"}
                                </button>
                            </div>

                            <div className="composer-hint">
                                <span>
                                    Göndermek için Enter'a basın
                                </span>

                                <span>
                                    Yeni satır için Shift + Enter
                                </span>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}



export default AiAgentPage;