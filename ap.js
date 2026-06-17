          

    <!-- AI Chat Assistant FAB -->
    <button class="ai-fab" onclick="openAIChat()" title="AI Assistant">🤖</button>

    <div class="modal-overlay" id="matrixModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('matrixModal')">✖</span>
            <h2 style="margin-top: 0; text-align: center; font-size:20px;">🔲 Eisenhower Matrix</h2>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:20px;">
                <div style="background:#fff0f0; padding:12px; border-radius:14px;">
                    <h4 style="margin:0 0 10px; font-size:12px; color:#ff3b30;">🔴 Do First</h4>
                    <div id="q1Tasks"></div>
                </div>
                <div style="background:#fff8e5; padding:12px; border-radius:14px;">
                    <h4 style="margin:0 0 10px; font-size:12px; color:#ff9500;">🟡 Schedule</h4>
                    <div id="q2Tasks"></div>
                </div>
                <div style="background:#e5f9e9; padding:12px; border-radius:14px;">
                    <h4 style="margin:0 0 10px; font-size:12px; color:#34c759;">🟢 Delegate</h4>
                    <div id="q3Tasks"></div>
                </div>
                <div style="background:#e5f1ff; padding:12px; border-radius:14px;">
                    <h4 style="margin:0 0 10px; font-size:12px; color:#007aff;">🔵 Eliminate</h4>
                    <div id="q4Tasks"></div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="briefingModal">
        <div class="modal-content" style="text-align: center;">
            <span class="close-modal-btn" onclick="closeModal('briefingModal')">✖</span>
            <h1 style="margin-top: 0; font-size: 50px; margin-bottom: 10px;">🌅</h1>
            <h2 style="color: var(--primary); margin-top:0;">Good Morning!</h2>
            <div style="background: #f2f2f7; padding: 20px; border-radius: 16px; margin: 20px 0; text-align: left;">
                <h4 style="margin: 0 0 10px 0; font-size:15px;">🎯 Tasks Scheduled: <span id="briefingTaskCount" style="color: var(--primary);">0</span></h4>
                <h4 style="margin: 0; font-size:15px;">🔥 Habits Pending: <span id="briefingHabitCount" style="color: #ff9500;">0</span></h4>
            </div>
            <button class="add-btn" onclick="closeModal('briefingModal')">Start My Day</button>
        </div>
    </div>

    <div class="modal-overlay" id="proModal">
        <div class="modal-content" style="text-align: center;">
            <span class="close-modal-btn" onclick="closeModal('proModal')">✖</span>
            <h1 style="margin-top: 0; font-size: 50px; margin-bottom: 10px;">👑</h1>
            <h2 style="color: #ff9500; margin-top:0;">Master PRO</h2>
            <ul style="text-align: left; font-size: 15px; line-height: 2; margin-bottom: 25px; padding-left: 20px; font-weight:600; color:#666;">
                <li>✨ Exclusive Gold Theme</li>
                <li>👑 PRO Badge on profile</li>
                <li>🪄 Unlimited AI Assistant</li>
                <li>☁️ Advanced Backup</li>
            </ul>
            <button class="add-btn" onclick="activatePro()" style="background: linear-gradient(135deg, #ffd60a, #ff9f0a); color: white;">Upgrade for $4.99/mo</button>
            <p style="font-size: 11px; color: #8e8e93; margin-top: 10px;">(This is a demo. Clicking upgrades for free!)</p>
        </div>
    </div>

    <div class="modal-overlay" id="analyticsModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('analyticsModal')">✖</span>
            <h2 style="margin-top: 0; margin-bottom: 15px; font-size:20px;">📊 Report</h2>
            <div class="report-toggle">
                <button id="reportBtn-week" class="active" onclick="setReportPeriod('week')">📅 Weekly</button>
                <button id="reportBtn-month" onclick="setReportPeriod('month')">🗓️ Monthly</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                <div style="background:#f2f2f7; padding:15px; border-radius:14px; text-align:center;">
                    <h5 style="margin:0 0 5px; color:#8e8e93; font-size:11px;">Total Tasks</h5>
                    <h2 id="statTotalTasks" style="margin:0; font-size:22px;">0</h2>
                </div>
                <div style="background:#e5f9e9; padding:15px; border-radius:14px; text-align:center;">
                    <h5 style="margin:0 0 5px; color:#34c759; font-size:11px;">Completed</h5>
                    <h2 id="statCompletedTasks" style="margin:0; color:#34c759; font-size:22px;">0</h2>
                </div>
            </div>
            <div style="background: #f2f2f7; padding: 15px; border-radius: 16px; margin-bottom: 20px;">
                <canvas id="productivityChart" width="400" height="200"></canvas>
            </div>

            <!-- Extended Report Stats -->
            <div id="extendedReportStats" style="background:#f2f2f7; padding:15px; border-radius:16px; margin-bottom:20px;"></div>

            <!-- Productivity Heatmap -->
            <div style="background:#f2f2f7; padding:15px; border-radius:16px; margin-bottom:20px;">
                <h5 style="margin:0 0 10px; font-size:11px; color:#8e8e93; text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">🔥 Productivity Heatmap (12 Weeks)</h5>
                <div class="heatmap-wrap">
                    <div class="heatmap-grid" id="productivityHeatmap"></div>
                </div>
                <div class="heatmap-legend">
                    Less
                    <span class="heatmap-cell" style="background:#ebedf0;"></span>
                    <span class="heatmap-cell" style="background:#9be9a8;"></span>
                    <span class="heatmap-cell" style="background:#40c463;"></span>
                    <span class="heatmap-cell" style="background:#216e39;"></span>
                    More
                </div>
            </div>

            <!-- Goal Prediction -->
            <div style="background:#f2f2f7; padding:15px; border-radius:16px; margin-bottom:20px;">
                <h5 style="margin:0 0 10px; font-size:11px; color:#8e8e93; text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">🔮 Goal Prediction</h5>
                <div id="goalPredictionContainer"></div>
            </div>

            <button onclick="generateAIReview()" class="add-btn" style="background:#5e5ce6; margin-bottom:15px; font-size:14px; padding:12px;">🪄 AI Performance Review</button>
            <div id="aiReviewOutput" style="font-size:13px; font-weight:600; color:var(--primary); text-align:center;"></div>
        </div>
    </div>

    <div class="modal-overlay" id="leaderboardModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('leaderboardModal')">✖</span>
            <h2 style="margin-top: 0; margin-bottom: 15px; font-size:20px;">🏆 Leaderboard</h2>
            <div id="leaderboardContainer" style="background: #f2f2f7; border-radius: 16px; padding: 15px; min-height: 100px;">
                <p style="text-align:center; color:#8e8e93; font-size:13px;">Loading Top Users...</p>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="fullCalendarModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('fullCalendarModal')">✖</span>
            <h2 style="margin-top: 0; margin-bottom: 20px; text-align: center; font-size:20px;">🗓️ Calendar</h2>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
                <button onclick="changeMonth(-1)" style="background:#f2f2f7; border:none; padding:8px 12px; border-radius:10px; font-weight:600; cursor:pointer;">Prev</button>
                <h3 id="calMonthDisplay" style="margin:0; font-size:16px;">Month</h3>
                <button onclick="changeMonth(1)" style="background:#f2f2f7; border:none; padding:8px 12px; border-radius:10px; font-weight:600; cursor:pointer;">Next</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align:center; font-weight: 700; color: #8e8e93; font-size:13px; margin-bottom:10px;">
                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;" id="fullCalendarGrid"></div>
        </div>
    </div>

    <div class="modal-overlay" id="pomodoroModal">
        <div class="modal-content" style="text-align: center;">
            <span class="close-modal-btn" onclick="closeModal('pomodoroModal'); if(document.body.classList.contains('zen-mode')) toggleZenMode();">✖</span>
            <h2 style="margin-top: 0; font-size:22px;">🍅 Focus Timer</h2>
            <select id="pomoTaskSelect" style="margin-top: 15px; padding: 12px; border-radius:12px;">
                <option value="">🎯 Select Task (Optional)</option>
            </select>
            <select id="pomoTimeSelect" style="margin-top: 10px; padding: 12px; border-radius:12px;" onchange="resetPomo()">
                <option value="1500">⏳ 25 Min</option>
                <option value="3000">⏳ 50 Min</option>
                <option value="300">☕ 5 Min Break</option>
            </select>
            <div id="pomodoroDisplay" style="font-size: 60px; font-weight: 700; font-variant-numeric: tabular-nums; margin: 25px 0; color:#ff3b30;">25:00</div>
            <div style="display:flex; gap:10px;">
                <button class="add-btn" style="flex:1; background:#34c759; margin:0;" onclick="startPomo()">Start</button>
                <button class="add-btn" style="flex:1; background:#ff9500; margin:0;" onclick="pausePomo()">Pause</button>
                <button class="add-btn" style="flex:1; background:#e5e5ea; color:#1c1c1e; margin:0; box-shadow:none;" onclick="resetPomo()">Reset</button>
            </div>
        </div>
    </div>

    <!-- Feature 2: Projects Modal -->
    <div class="modal-overlay" id="projectsModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('projectsModal')">✖</span>
            <h2 style="margin-top:0; font-size:20px;">📁 Projects / Folders</h2>
            <div style="display:flex; gap:8px; margin-bottom:15px; align-items:center;">
                <input type="text" id="newProjectName" placeholder="Project name..." style="flex:1; margin:0; padding:10px 14px;">
                <input type="text" id="newProjectEmoji" placeholder="📁" style="width:50px; margin:0; padding:10px; text-align:center;">
                <input type="color" id="newProjectColor" value="#007aff" style="width:42px; height:42px; border:none; border-radius:10px; padding:2px; cursor:pointer; margin:0;">
                <button onclick="addProject()" style="background:var(--primary); color:white; border:none; border-radius:10px; padding:10px 14px; font-weight:700; cursor:pointer; white-space:nowrap;">Add</button>
            </div>
            <div id="projectsListContainer">
                <p style="text-align:center; color:#8e8e93; font-size:13px;">No projects yet</p>
            </div>
        </div>
    </div>

    <!-- Feature 5: Share Task Modal -->
    <div class="modal-overlay" id="shareTaskModal">
        <div class="modal-content" style="text-align:center;">
            <span class="close-modal-btn" onclick="closeModal('shareTaskModal')">✖</span>
            <h3 id="shareTaskTitle" style="margin-top:0; font-size:18px;">📤 Share Task</h3>
            <p style="color:#8e8e93; font-size:13px; margin-bottom:20px;">Enter the email of the family member or friend</p>
            <input type="email" id="shareEmailInput" placeholder="friend@email.com" style="text-align:center;">
            <button class="add-btn" onclick="shareTaskWithFamily()" style="background:#5e5ce6;">📤 Share Task</button>
        </div>
    </div>

    <!-- Feature 5: Shared With Me Modal -->
    <div class="modal-overlay" id="sharedWithMeModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('sharedWithMeModal')">✖</span>
            <h2 style="margin-top:0; font-size:20px;">📥 Shared With Me</h2>
            <div id="sharedTasksContainer">
                <p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">Loading...</p>
            </div>
        </div>
    </div>

    <!-- AI Chat Assistant Modal -->
    <div class="modal-overlay" id="aiChatModal">
        <div class="modal-content" style="display:flex; flex-direction:column; height:80vh; max-height:600px;">
            <span class="close-modal-btn" onclick="closeModal('aiChatModal')">✖</span>
            <h2 style="margin-top:0; margin-bottom:10px; font-size:18px;">🤖 AI Assistant</h2>
            <div id="aiChatMessages" style="flex:1; overflow-y:auto; padding:5px 2px; display:flex; flex-direction:column;">
                <div class="chat-bubble ai">Hi! I can plan your day, fix overdue tasks, or answer questions about your reminders & habits. 🪄</div>
            </div>
            <div style="display:flex; gap:6px; margin:10px 0; overflow-x:auto; padding-bottom:2px;">
                <button onclick="aiQuickAction('plan')" style="background:#e5f1ff; color:var(--primary); border:none; border-radius:10px; padding:8px 12px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; flex-shrink:0;">🪄 Plan My Day</button>
                <button onclick="aiQuickAction('reschedule')" style="background:#fff8e8; color:#ff9500; border:none; border-radius:10px; padding:8px 12px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; flex-shrink:0;">🔄 Fix Overdue</button>
                <button onclick="aiQuickAction('summary')" style="background:#e5f9e9; color:#34c759; border:none; border-radius:10px; padding:8px 12px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; flex-shrink:0;">📊 Summary</button>
            </div>
            <div style="display:flex; gap:8px;">
                <input type="text" id="aiChatInput" placeholder="Ask anything about your tasks..." style="margin:0; flex:1;" onkeypress="if(event.key==='Enter') sendAIChatMessage();">
                <button onclick="sendAIChatMessage()" style="background:var(--primary); color:white; border:none; border-radius:12px; padding:0 18px; font-weight:700; cursor:pointer; font-size:16px;">➤</button>
            </div>
        </div>
    </div>

    <!-- Family Calendar Modal -->
    <div class="modal-overlay" id="familyModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('familyModal')">✖</span>
            <h2 style="margin-top:0; margin-bottom:5px; font-size:20px;">👨‍👩‍👧 Family Calendar</h2>
            <p style="font-size:12px; color:#8e8e93; margin:0 0 15px;">Tasks shared between you & family members</p>
            <div id="familyContainer">
                <p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">Loading...</p>
            </div>
        </div>
    </div>

    <!-- Habit Detail Modal -->
    <div class="modal-overlay" id="habitDetailModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('habitDetailModal')">✖</span>
            <h2 id="habitDetailTitle" style="margin-top:0; margin-bottom:15px; font-size:20px;">📈 Habit</h2>

            <div id="habitScoreCircle" class="habit-score-circle" style="background:#e5f1ff; color:var(--primary);">0</div>
            <p style="text-align:center; font-size:11px; color:#8e8e93; margin:-8px 0 15px; text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Habit Score</p>

            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:20px;">
                <div style="background:#f2f2f7; padding:10px; border-radius:12px; text-align:center;">
                    <h5 style="margin:0 0 4px; font-size:10px; color:#8e8e93;">Streak</h5>
                    <h3 id="habitDetailStreak" style="margin:0; font-size:18px;">0</h3>
                </div>
                <div style="background:#f2f2f7; padding:10px; border-radius:12px; text-align:center;">
                    <h5 style="margin:0 0 4px; font-size:10px; color:#8e8e93;">Best</h5>
                    <h3 id="habitDetailBest" style="margin:0; font-size:18px;">0</h3>
                </div>
                <div style="background:#f2f2f7; padding:10px; border-radius:12px; text-align:center;">
                    <h5 style="margin:0 0 4px; font-size:10px; color:#8e8e93;">30d Rate</h5>
                    <h3 id="habitDetailRate" style="margin:0; font-size:18px;">0%</h3>
                </div>
            </div>

            <h5 style="font-size:11px; color:#8e8e93; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin:0 0 8px;">📅 This Month — Habit Calendar</h5>
            <div class="cal-weekdays"><div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div></div>
            <div class="cal-grid" id="habitCalGrid" style="margin-bottom:20px;"></div>

            <h5 style="font-size:11px; color:#8e8e93; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin:0 0 8px;">📊 Habit Graph — Last 8 Weeks</h5>
            <div style="background:#f2f2f7; padding:12px; border-radius:14px; margin-bottom:20px;">
                <canvas id="habitGraphChart" height="120"></canvas>
            </div>

            <h5 style="font-size:11px; color:#8e8e93; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin:0 0 8px;">⚠️ Missed Habit Analysis (30 days)</h5>
            <div id="habitMissedAnalysis" style="background:#fff8e8; border-radius:14px; padding:12px; font-size:12px; line-height:1.6;"></div>
        </div>
    </div>

    <!-- Kanban Board Modal -->
    <div class="modal-overlay" id="kanbanModal">
        <div class="modal-content" style="max-width:96%; width:96%;">
            <span class="close-modal-btn" onclick="closeModal('kanbanModal')">✖</span>
            <h2 style="margin-top:0; margin-bottom:15px; font-size:20px;">🗂️ Kanban Board</h2>
            <p style="font-size:11px; color:#8e8e93; margin:-10px 0 12px;">Drag cards between columns ↔️</p>
            <div class="kanban-board">
                <div class="kanban-column">
                    <div class="kanban-column-header"><span>📋 To Do</span><span id="kanbanCountTodo">0</span></div>
                    <div id="kanbanColTodo" class="kanban-col-list" data-col="todo"></div>
                </div>
                <div class="kanban-column">
                    <div class="kanban-column-header"><span>⚡ In Progress</span><span id="kanbanCountInprogress">0</span></div>
                    <div id="kanbanColInprogress" class="kanban-col-list" data-col="inprogress"></div>
                </div>
                <div class="kanban-column">
                    <div class="kanban-column-header"><span>✅ Done</span><span id="kanbanCountDone">0</span></div>
                    <div id="kanbanColDone" class="kanban-col-list" data-col="done"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Project Detail Modal (Progress / Milestones / Timeline) -->
    <div class="modal-overlay" id="projectDetailModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('projectDetailModal')">✖</span>
            <h2 id="projectDetailTitle" style="margin-top:0; margin-bottom:10px; font-size:20px;">📁 Project</h2>
            <div id="projectDetailProgress" style="margin-bottom:15px;"></div>

            <h5 style="font-size:11px; color:#8e8e93; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin:0 0 4px;">📈 Timeline</h5>
            <div class="timeline-wrap"><div class="timeline-track" id="projectTimeline"></div></div>

            <h5 style="font-size:11px; color:#8e8e93; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin:15px 0 8px;">🏁 Milestones</h5>
            <div style="display:flex; gap:8px; margin-bottom:12px;">
                <input type="text" id="milestoneNameInput" placeholder="Milestone name" style="margin:0; flex:1.5;">
                <input type="date" id="milestoneDateInput" style="margin:0; flex:1;">
                <button onclick="addMilestone()" style="background:var(--primary); color:white; border:none; border-radius:10px; padding:0 14px; font-weight:700; cursor:pointer;">Add</button>
            </div>
            <div id="milestonesContainer"></div>
        </div>
    </div>

    <!-- Shared Workspace Modal -->
    <div class="modal-overlay" id="workspaceModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('workspaceModal')">✖</span>
            <h2 style="margin-top:0; margin-bottom:5px; font-size:20px;">👥 Shared Workspace</h2>
            <p style="font-size:12px; color:#8e8e93; margin:0 0 15px;">A shared task list for family or team — anyone with the code can add & check off items.</p>

            <div id="workspaceSetup">
                <label style="font-size:12px; font-weight:700; color:#8e8e93;">Create New</label>
                <div style="display:flex; gap:8px; margin:8px 0 16px;">
                    <input type="text" id="workspaceNameInput" placeholder="e.g. Home, Team Alpha" style="margin:0; flex:1;">
                    <button onclick="createWorkspace()" style="background:var(--primary); color:white; border:none; border-radius:10px; padding:0 16px; font-weight:700; cursor:pointer;">Create</button>
                </div>
                <label style="font-size:12px; font-weight:700; color:#8e8e93;">Join Existing</label>
                <div style="display:flex; gap:8px; margin:8px 0;">
                    <input type="text" id="workspaceJoinCode" placeholder="Enter 6-letter code" style="margin:0; flex:1; text-transform:uppercase;">
                    <button onclick="joinWorkspace()" style="background:#5e5ce6; color:white; border:none; border-radius:10px; padding:0 16px; font-weight:700; cursor:pointer;">Join</button>
                </div>
            </div>

            <div id="workspaceActive" style="display:none;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <div>
                        <h3 id="workspaceActiveName" style="margin:0; font-size:17px;"></h3>
                        <p style="margin:2px 0 0; font-size:11px; color:#8e8e93;">Code: <b id="workspaceActiveCode"></b> · <span id="workspaceMemberCount"></span> members</p>
                    </div>
                    <button onclick="leaveWorkspace()" style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:10px; padding:8px 12px; font-weight:700; font-size:12px; cursor:pointer;">Leave</button>
                </div>
                <div style="display:flex; gap:8px; margin-bottom:12px;">
                    <input type="text" id="workspaceTaskInput" placeholder="Add shared task..." style="margin:0; flex:1;" onkeypress="if(event.key==='Enter') addWorkspaceTask();">
                    <button onclick="addWorkspaceTask()" style="background:var(--primary); color:white; border:none; border-radius:10px; padding:0 16px; font-weight:700; cursor:pointer;">Add</button>
                </div>
                <div id="workspaceTasksContainer"></div>
                <button onclick="syncWorkspace()" style="margin-top:10px; background:#f2f2f7; border:none; border-radius:10px; padding:10px; width:100%; font-weight:700; color:var(--primary); cursor:pointer;">🔄 Refresh</button>
            </div>
        </div>
    </div>

    <!-- Shift Schedule Modal -->
    <div class="modal-overlay" id="shiftModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('shiftModal')">✖</span>
            <h2 style="margin-top:0; margin-bottom:15px; font-size:20px;">🔄 Shift Schedule</h2>

            <div class="cal-view-toggle">
                <button class="cal-view-btn shift-view-btn active" id="shifttab-setup" onclick="setShiftTab('setup')">⚙️ Setup</button>
                <button class="cal-view-btn shift-view-btn" id="shifttab-calendar" onclick="setShiftTab('calendar')">📅 Calendar</button>
            </div>

            <!-- SETUP TAB -->
            <div id="shiftTabSetup">
                <h5 style="font-size:11px; color:#8e8e93; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin:0 0 8px;">Shift Types</h5>
                <div id="shiftTypesContainer" style="margin-bottom:10px;"></div>
                <div style="display:flex; gap:6px; margin-bottom:6px; flex-wrap:wrap;">
                    <input type="text" id="newShiftName" placeholder="Name (e.g. Morning)" style="flex:2; min-width:110px; margin:0;">
                    <input type="text" id="newShiftEmoji" placeholder="🌅" style="width:46px; margin:0; text-align:center;">
                    <input type="color" id="newShiftColor" value="#ff9500" style="width:42px; height:38px; padding:2px; border:none; border-radius:8px; margin:0; cursor:pointer;">
                </div>
                <div style="display:flex; gap:6px; margin-bottom:6px;">
                    <input type="time" id="newShiftStart" style="flex:1; margin:0;">
                    <input type="time" id="newShiftEnd" style="flex:1; margin:0;">
                    <button onclick="addShiftType()" style="background:var(--primary); color:white; border:none; border-radius:10px; padding:0 16px; font-weight:700; cursor:pointer;">Add</button>
                </div>
                <p style="font-size:11px; color:#8e8e93; margin:0 0 20px;">💡 "Off day" માટે time fields blank રાખો</p>

                <h5 style="font-size:11px; color:#8e8e93; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; margin:0 0 6px;">Rotation Pattern</h5>
                <p style="font-size:11px; color:#8e8e93; margin:0 0 8px;">Tap shift chips below to build your repeating cycle (e.g. Morning, Morning, Evening, Off)</p>
                <div id="shiftPatternBuilder" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;"></div>
                <div id="shiftPatternSequence" style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; min-height:40px; background:#f2f2f7; border-radius:12px; padding:8px; margin-bottom:10px;"></div>

                <label style="font-size:12px; font-weight:700; color:#8e8e93;">Cycle Day 1 starts on:</label>
                <input type="date" id="shiftPatternStartDate" onchange="saveShiftPattern()" style="margin-bottom:15px;">

                <div style="background:#f2f2f7; border-radius:14px; padding:5px 15px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; ${''}">
                        <span style="font-size:14px; font-weight:600;">🔔 Auto Shift Reminders</span>
                        <input type="checkbox" id="shiftReminderToggle" onchange="saveShiftReminderSettings()" style="width:20px; height:20px; margin:0;">
                    </div>
                    <div id="shiftReminderMinutesWrap" style="padding-bottom:12px; display:none;">
                        <label style="font-size:12px; color:#8e8e93;">Remind me before shift starts:</label>
                        <select id="shiftReminderMinutes" onchange="saveShiftReminderSettings()" style="margin-bottom:0;">
                            <option value="30">30 min</option>
                            <option value="60" selected>1 hour</option>
                            <option value="90">1.5 hours</option>
                            <option value="120">2 hours</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- CALENDAR TAB -->
            <div id="shiftTabCalendar" style="display:none;">
                <div class="cal-header">
                    <button class="cal-nav-btn" onclick="changeShiftCalMonth(-1)">◀</button>
                    <h3 id="shiftCalMonthDisplay">Month Year</h3>
                    <button class="cal-nav-btn" onclick="changeShiftCalMonth(1)">▶</button>
                </div>
                <div class="cal-weekdays">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div class="cal-grid" id="shiftCalGrid"></div>
                <div id="shiftCalLegend" style="display:flex; gap:10px; flex-wrap:wrap; margin-top:14px;"></div>
                <p style="font-size:11px; color:#8e8e93; margin-top:10px; text-align:center;">Tap any day to override its shift 👆 (📌 = manually set)</p>
            </div>
        </div>
    </div>

    <!-- Shift Override Modal -->
    <div class="modal-overlay" id="shiftOverrideModal">
        <div class="modal-content" style="text-align:center;">
            <span class="close-modal-btn" onclick="closeModal('shiftOverrideModal')">✖</span>
            <h3 id="shiftOverrideDateLabel" style="margin-top:0; margin-bottom:15px;">Set Shift</h3>
            <div id="shiftOverrideOptions" style="display:flex; flex-direction:column; gap:8px;"></div>
        </div>
    </div>
    <!-- Medicine Scheduler Modal -->
    <div class="modal-overlay" id="medicineModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('medicineModal')">✖</span>
            <h2 style="margin-top:0; font-size:20px;">💊 Medicine Scheduler</h2>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                <input type="text" id="medNameInput" placeholder="Medicine name" style="flex:2; margin:0; min-width:120px;">
                <input type="text" id="medDoseInput" placeholder="Dose (e.g. 1 tab)" style="flex:1; margin:0; min-width:80px;">
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:15px;">
                <input type="time" id="medTimeInput" style="flex:1; margin:0;">
                <select id="medFreqInput" style="flex:1; margin:0;">
                    <option value="daily">Daily</option>
                    <option value="morning">Morning Only</option>
                    <option value="evening">Evening Only</option>
                    <option value="sos">SOS (as needed)</option>
                </select>
                <button onclick="addMedicine()" style="background:#5e5ce6; color:white; border:none; border-radius:10px; padding:0 16px; font-weight:700; cursor:pointer;">Add</button>
            </div>
            <div id="medicineList"></div>
        </div>
    </div>

    <!-- Vehicle Reminder Modal -->
    <div class="modal-overlay" id="vehicleModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('vehicleModal')">✖</span>
            <h2 style="margin-top:0; font-size:20px;">🚗 Vehicle Reminder</h2>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                <input type="text" id="vehNameInput" placeholder="Vehicle (e.g. My Car)" style="flex:2; margin:0;">
                <input type="text" id="vehReminderInput" placeholder="Reminder (e.g. PUC, Oil Change)" style="flex:2; margin:0;">
            </div>
            <div style="display:flex; gap:8px; margin-bottom:15px;">
                <input type="date" id="vehDueInput" style="flex:1; margin:0;">
                <select id="vehTypeInput" style="flex:1; margin:0;">
                    <option>🛢️ Oil Change</option><option>🔧 Service</option><option>📋 PUC</option>
                    <option>📄 Insurance</option><option>🪪 RC Renewal</option><option>⛽ Fuel</option><option>📦 Other</option>
                </select>
                <button onclick="addVehicleReminder()" style="background:#ff9500; color:white; border:none; border-radius:10px; padding:0 16px; font-weight:700; cursor:pointer;">Add</button>
            </div>
            <div id="vehicleReminderList"></div>
        </div>
    </div>

    <!-- Shopping Modal -->
    <div class="modal-overlay" id="shoppingModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('shoppingModal')">✖</span>
            <h2 style="margin-top:0; font-size:20px;">🛒 Shopping List</h2>
            <div style="display:flex; gap:8px; margin-bottom:8px;">
                <input type="text" id="shopNameInput" placeholder="Select list name" style="flex:1; margin:0;">
                <button onclick="addShopList()" style="background:var(--primary); color:white; border:none; border-radius:10px; padding:0 14px; font-weight:700; cursor:pointer;">+ List</button>
            </div>
            <select id="shopListSelect" onchange="renderShoppingItems()" style="margin-bottom:10px;"></select>
            <div style="display:flex; gap:8px; margin-bottom:15px;">
                <input type="text" id="shopItemInput" placeholder="Add item..." style="flex:1; margin:0;" onkeypress="if(event.key==='Enter') addShopItem();">
                <input type="number" id="shopQtyInput" placeholder="Qty" style="width:60px; margin:0;">
                <button onclick="addShopItem()" style="background:#34c759; color:white; border:none; border-radius:10px; padding:0 14px; font-weight:700; cursor:pointer;">Add</button>
            </div>
            <div id="shoppingItems"></div>
            <div id="shoppingTotal" style="text-align:right; font-weight:800; font-size:14px; margin-top:10px; color:var(--primary);"></div>
        </div>
    </div>

    <!-- Travel Modal -->
    <div class="modal-overlay" id="travelModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('travelModal')">✖</span>
            <h2 style="margin-top:0; font-size:20px;">✈️ Travel Planner</h2>
            <div class="cal-view-toggle">
                <button class="cal-view-btn active" id="traveltab-trips" onclick="setTravelTab('trips')">🗺️ Trips</button>
                <button class="cal-view-btn" id="traveltab-packing" onclick="setTravelTab('packing')">🧳 Packing</button>
            </div>
            <div id="travelTabTrips">
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                    <input type="text" id="tripNameInput" placeholder="Trip name" style="flex:2; margin:0;">
                    <input type="text" id="tripDestInput" placeholder="Destination" style="flex:2; margin:0;">
                </div>
                <div style="display:flex; gap:8px; margin-bottom:15px;">
                    <input type="date" id="tripFromInput" style="flex:1; margin:0;">
                    <input type="date" id="tripToInput" style="flex:1; margin:0;">
                    <button onclick="addTrip()" style="background:var(--primary); color:white; border:none; border-radius:10px; padding:0 14px; font-weight:700; cursor:pointer;">Add</button>
                </div>
                <div id="tripsList"></div>
            </div>
            <div id="travelTabPacking" style="display:none;">
                <div style="display:flex; gap:8px; margin-bottom:15px;">
                    <input type="text" id="packItemInput" placeholder="Add packing item..." style="flex:1; margin:0;" onkeypress="if(event.key==='Enter') addPackingItem();">
                    <select id="packCatInput" style="flex:1; margin:0;">
                        <option>👕 Clothes</option><option>🪥 Toiletries</option><option>💊 Medicine</option>
                        <option>📱 Electronics</option><option>📄 Documents</option><option>📦 Other</option>
                    </select>
                    <button onclick="addPackingItem()" style="background:#34c759; color:white; border:none; border-radius:10px; padding:0 14px; font-weight:700; cursor:pointer;">Add</button>
                </div>
                <div id="packingList"></div>
            </div>
        </div>
    </div>

    <!-- Attendance Tracker Modal -->
    <div class="modal-overlay" id="attendanceModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('attendanceModal')">✖</span>
            <h2 style="margin-top:0; font-size:20px;">📋 Attendance Tracker</h2>
            <div style="display:flex; gap:8px; margin-bottom:15px;">
                <input type="text" id="attSubjectInput" placeholder="Subject / Course" style="flex:1; margin:0;">
                <button onclick="addAttSubject()" style="background:var(--primary); color:white; border:none; border-radius:10px; padding:0 14px; font-weight:700; cursor:pointer;">Add</button>
            </div>
            <div id="attSubjectList"></div>
        </div>
    </div>

    <!-- Life Events Timeline Modal -->
    <div class="modal-overlay" id="lifeEventsModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('lifeEventsModal')">✖</span>
            <h2 style="margin-top:0; font-size:20px;">🌟 Life Events Timeline</h2>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                <input type="text" id="lifeEventNameInput" placeholder="Event (e.g. Graduation)" style="flex:2; margin:0;">
                <input type="text" id="lifeEventEmojiInput" placeholder="🎓" style="width:48px; text-align:center; margin:0;">
            </div>
            <div style="display:flex; gap:8px; margin-bottom:15px;">
                <input type="date" id="lifeEventDateInput" style="flex:1; margin:0;">
                <input type="color" id="lifeEventColorInput" value="#007aff" style="width:42px; height:42px; padding:2px; border:none; border-radius:8px; cursor:pointer; margin:0;">
                <button onclick="addLifeEvent()" style="background:var(--primary); color:white; border:none; border-radius:10px; padding:0 14px; font-weight:700; cursor:pointer;">Add</button>
            </div>
            <div id="lifeEventsContainer"></div>
        </div>
    </div>

    <!-- Subscription Tracker Modal -->
    <div class="modal-overlay" id="subModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('subModal')">✖</span>
            <h2 style="margin-top:0; font-size:20px;">🔄 Subscriptions</h2>
            <div id="subSummary" style="background:#f2f2f7; border-radius:14px; padding:12px; margin-bottom:12px; text-align:center;"></div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                <input type="text" id="subNameInput" placeholder="Netflix, Spotify..." style="flex:2; margin:0; min-width:120px;">
                <input type="number" id="subAmtInput" placeholder="₹/month" style="flex:1; margin:0; min-width:70px;">
            </div>
            <div style="display:flex; gap:8px; margin-bottom:15px;">
                <input type="date" id="subRenewInput" style="flex:1; margin:0;">
                <select id="subFreqInput" style="flex:1; margin:0;">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekly">Weekly</option>
                </select>
                <button onclick="addSubscription()" style="background:#af52de; color:white; border:none; border-radius:10px; padding:0 14px; font-weight:700; cursor:pointer;">Add</button>
            </div>
            <div id="subList"></div>
        </div>
    </div>

    <!-- Secret Space Modal -->
    <div class="modal-overlay" id="secretModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('secretModal')">✖</span>
            <div id="secretLockScreen">
                <h2 style="margin-top:0; font-size:22px; text-align:center;">🔐 Secret Space</h2>
                <p style="font-size:13px; color:#8e8e93; text-align:center; margin-bottom:20px;">Enter your secret PIN</p>
                <input type="password" id="secretPinInput" placeholder="4-digit PIN" maxlength="4" inputmode="numeric" style="text-align:center; font-size:24px; letter-spacing:8px; margin-bottom:10px;" onkeypress="if(event.key==='Enter') unlockSecret();">
                <button onclick="unlockSecret()" style="background:var(--primary); color:white; border:none; border-radius:10px; padding:12px; width:100%; font-weight:700; cursor:pointer;">Unlock 🔓</button>
                <button onclick="setupSecretPin()" style="background:#f2f2f7; border:none; border-radius:10px; padding:10px; width:100%; font-weight:700; cursor:pointer; margin-top:8px; color:#8e8e93;">Set/Change PIN</button>
            </div>
            <div id="secretUnlocked" style="display:none;">
                <h2 style="margin-top:0; font-size:20px;">🔐 Secret Space</h2>
                <textarea id="secretNoteInput" placeholder="Your private notes here... 🤫" style="width:100%; min-height:150px; border:1px solid #e5e5ea; border-radius:12px; padding:12px; font-size:13px; resize:vertical; font-family:inherit; margin-bottom:10px;"></textarea>
                <div style="display:flex; gap:8px;">
                    <button onclick="saveSecretNote()" style="flex:1; background:var(--primary); color:white; border:none; border-radius:10px; padding:12px; font-weight:700; cursor:pointer;">Save 🔒</button>
                    <button onclick="lockSecret()" style="flex:1; background:#f2f2f7; border:none; border-radius:10px; padding:12px; font-weight:700; cursor:pointer; color:#8e8e93;">Lock</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Weather Modal -->
    <div class="modal-overlay" id="weatherModal">
        <div class="modal-content" style="text-align:center;">
            <span class="close-modal-btn" onclick="closeModal('weatherModal')">✖</span>
            <h2 style="margin-top:0; font-size:20px;">🌤️ Weather</h2>
            <div style="display:flex; gap:8px; margin-bottom:15px;">
                <input type="text" id="weatherCityInput" placeholder="City name (e.g. Surat)" style="flex:1; margin:0;">
                <button onclick="fetchWeather()" style="background:var(--primary); color:white; border:none; border-radius:10px; padding:0 16px; font-weight:700; cursor:pointer;">Get</button>
            </div>
            <p style="font-size:11px; color:#8e8e93; margin:-8px 0 15px;">Free API: openweathermap.org → get key → Settings → add below</p>
            <input type="text" id="weatherApiKeyInput" placeholder="OpenWeatherMap API Key" style="margin-bottom:10px;">
            <button onclick="saveWeatherKey()" style="background:#f2f2f7; border:none; border-radius:10px; padding:10px; width:100%; font-weight:700; cursor:pointer; color:#8e8e93; margin-bottom:15px;">Save API Key</button>
            <div id="weatherResult"></div>
        </div>
    </div>

    <!-- Birthday Tracker Modal -->
    <div class="modal-overlay" id="birthdayModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('birthdayModal')">✖</span>
            <h2 style="margin-top:0;font-size:20px;">🎂 Birthday Tracker</h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                <input type="text" id="bdayNameInput" placeholder="Name" style="flex:2;margin:0;min-width:120px;">
                <input type="date" id="bdayDateInput" style="flex:1;margin:0;">
            </div>
            <div style="display:flex;gap:8px;margin-bottom:15px;">
                <select id="bdayRelInput" style="flex:1;margin:0;">
                    <option>👨‍👩‍👧 Family</option><option>👫 Friend</option><option>💼 Colleague</option><option>💕 Partner</option><option>📦 Other</option>
                </select>
                <input type="text" id="bdayEmojiInput" placeholder="🎂" style="width:50px;text-align:center;margin:0;">
                <button onclick="addBirthday()" style="background:#ff2d55;color:white;border:none;border-radius:10px;padding:0 14px;font-weight:700;cursor:pointer;">Add</button>
            </div>
            <div id="birthdayList"></div>
        </div>
    </div>

    <!-- Home Management Modal -->
    <div class="modal-overlay" id="homeManagementModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('homeManagementModal')">✖</span>
            <h2 style="margin-top:0;font-size:20px;">🏠 Home Management</h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                <input type="text" id="choreNameInput" placeholder="Task (e.g. Vacuum living room)" style="flex:2;margin:0;min-width:130px;">
                <select id="choreFreqInput" style="flex:1;margin:0;">
                    <option value="daily">Daily</option><option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option><option value="once">One-time</option>
                </select>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:15px;">
                <select id="choreAreaInput" style="flex:1;margin:0;">
                    <option>🛋️ Living Room</option><option>🍳 Kitchen</option><option>🛏️ Bedroom</option>
                    <option>🚿 Bathroom</option><option>🌿 Garden</option><option>🏠 General</option>
                </select>
                <button onclick="addChore()" style="background:#34c759;color:white;border:none;border-radius:10px;padding:0 14px;font-weight:700;cursor:pointer;">Add</button>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:12px;">
                <button onclick="filterChores('all')" class="fin-tab-btn active" id="choreTab-all">All</button>
                <button onclick="filterChores('daily')" class="fin-tab-btn" id="choreTab-daily">Daily</button>
                <button onclick="filterChores('weekly')" class="fin-tab-btn" id="choreTab-weekly">Weekly</button>
                <button onclick="filterChores('monthly')" class="fin-tab-btn" id="choreTab-monthly">Monthly</button>
            </div>
            <div id="choreList"></div>
        </div>
    </div>

    <!-- Quick Notes Modal -->
    <div class="modal-overlay" id="quickNotesModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('quickNotesModal')">✖</span>
            <h2 style="margin-top:0;font-size:20px;">📝 Quick Notes</h2>
            <div style="display:flex;gap:8px;margin-bottom:10px;">
                <input type="text" id="quickNoteInput" placeholder="Type a note..." style="flex:1;margin:0;" onkeypress="if(event.key==='Enter') addQuickNote();">
                <select id="quickNoteColor" style="width:80px;margin:0;">
                    <option value="#fffde7">🟡 Yellow</option><option value="#e8f5e9">🟢 Green</option>
                    <option value="#e3f2fd">🔵 Blue</option><option value="#fce4ec">🔴 Pink</option>
                    <option value="#f3e5f5">🟣 Purple</option>
                </select>
                <button onclick="addQuickNote()" style="background:var(--primary);color:white;border:none;border-radius:10px;padding:0 14px;font-weight:700;cursor:pointer;">Add</button>
            </div>
            <input type="text" id="noteSearchInput" placeholder="🔍 Search notes..." oninput="renderQuickNotes()" style="margin-bottom:12px;">
            <div id="quickNotesList"></div>
        </div>
    </div>

    <!-- Pomodoro History Modal -->
    <div class="modal-overlay" id="pomoHistoryModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('pomoHistoryModal')">✖</span>
            <h2 style="margin-top:0;font-size:20px;">🍅 Focus History</h2>
            <div id="pomoHistSummary" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:15px;"></div>
            <div id="pomoHistList"></div>
        </div>
    </div>

    <!-- QR Share Modal -->
    <div class="modal-overlay" id="qrModal">
        <div class="modal-content" style="text-align:center;">
            <span class="close-modal-btn" onclick="closeModal('qrModal')">✖</span>
            <h2 style="margin-top:0;font-size:20px;">📱 QR Share</h2>
            <p style="font-size:13px;color:#8e8e93;margin-bottom:10px;">Share a task or note via QR Code</p>
            <select id="qrTaskSelect" onchange="generateQR()" style="margin-bottom:10px;"></select>
            <div id="qrCodeDisplay" style="display:flex;justify-content:center;padding:20px 0;"></div>
            <p id="qrTaskText" style="font-size:12px;color:#8e8e93;margin:0;"></p>
            <button onclick="downloadQR()" style="background:var(--primary);color:white;border:none;border-radius:10px;padding:10px 20px;font-weight:700;cursor:pointer;margin-top:12px;">⬇️ Download QR</button>
        </div>
    </div>

    <!-- Finance Charts Modal -->
    <div class="modal-overlay" id="financeChartsModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('financeChartsModal')">✖</span>
            <h2 style="margin-top:0;font-size:20px;">📊 Finance Charts</h2>
            <div class="fin-chart-wrap">
                <h5 style="margin:0 0 10px;font-size:11px;color:#8e8e93;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Expenses by Category</h5>
                <canvas id="expensePieChart" height="220"></canvas>
            </div>
            <div class="fin-chart-wrap">
                <h5 style="margin:0 0 10px;font-size:11px;color:#8e8e93;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Monthly Income vs Expense (6 months)</h5>
                <canvas id="incomeExpenseChart" height="160"></canvas>
            </div>
            <div id="finInsightsAI" style="background:#f2f2f7;border-radius:14px;padding:14px;margin-top:5px;font-size:13px;line-height:1.6;"></div>
        </div>
    </div>

    <!-- AI Coach Modal -->
    <div class="modal-overlay" id="aiCoachModal">
        <div class="modal-content">
            <span class="close-modal-btn" onclick="closeModal('aiCoachModal')">✖</span>
            <h2 style="margin-top:0;font-size:20px;">🧠 AI Productivity Coach</h2>
            <div id="aiCoachCard" class="ai-coach-card">
                <p style="margin:0;font-size:13px;color:#8e8e93;">Loading your personal coaching report...</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                <button onclick="getAICoachReport('productivity')" style="flex:1;background:#e5f1ff;color:var(--primary);border:none;border-radius:10px;padding:10px;font-weight:700;cursor:pointer;font-size:12px;">📊 Productivity</button>
                <button onclick="getAICoachReport('habits')" style="flex:1;background:#e5f9e9;color:#34c759;border:none;border-radius:10px;padding:10px;font-weight:700;cursor:pointer;font-size:12px;">🔥 Habits</button>
                <button onclick="getAICoachReport('finance')" style="flex:1;background:#fff8e8;color:#ff9500;border:none;border-radius:10px;padding:10px;font-weight:700;cursor:pointer;font-size:12px;">💰 Finance</button>
            </div>
            <div id="aiCoachDetail" style="background:#f2f2f7;border-radius:14px;padding:14px;font-size:13px;line-height:1.6;min-height:80px;"></div>
        </div>
    </div>

    <!-- PWA Install Banner (injected by JS) -->
    <div id="pwaBanner" class="pwa-banner" style="display:none;">
        <div><b style="font-size:14px;">📱 Install App</b><br><span style="font-size:11px;opacity:0.85;">Add to home screen for best experience</span></div>
        <div class="pwa-banner-btns">
            <button onclick="installPWA()" style="background:white;color:var(--primary);border:none;border-radius:10px;padding:8px 14px;font-weight:700;cursor:pointer;font-size:13px;">Install</button>
            <button onclick="document.getElementById('pwaBanner').style.display='none'" style="background:rgba(255,255,255,0.2);color:white;border:none;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;">✖</button>
        </div>
    </div>

    <!-- Voice Command Overlay -->
    <div id="voiceOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:200;flex-direction:column;align-items:center;justify-content:center;color:white;text-align:center;">
        <div style="font-size:60px;margin-bottom:15px;" class="voice-recording">🎤</div>
        <h2 style="margin:0 0 10px;">Listening...</h2>
        <p id="voiceTranscript" style="font-size:14px;color:rgba(255,255,255,0.8);max-width:300px;min-height:40px;"></p>
        <button onclick="stopVoiceCommand()" style="background:rgba(255,255,255,0.2);color:white;border:none;border-radius:12px;padding:12px 24px;font-weight:700;cursor:pointer;margin-top:15px;">Cancel</button>
    </div>

</div><!-- end #mainApp -->

<script type="text/javascript">
function googleTranslateElementInit() { 
    new google.translate.TranslateElement({pageLanguage: 'en', includedLanguages: 'en,gu,hi', layout: google.translate.TranslateElement.InlineLayout.SIMPLE}, 'google_translate_element'); 
}
</script>
<script type="text/javascript" src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>

<script>
    // --- FIREBASE INITIALIZATION & OFFLINE PERSISTENCE ---
    const firebaseConfig = {
      apiKey: "AIzaSyDc-k1JnOySVExS4QbDsbkh7Ro9pvNydIY",
      authDomain: "reminder-76588.firebaseapp.com",
      projectId: "reminder-76588",
      storageBucket: "reminder-76588.firebasestorage.app",
      messagingSenderId: "813515230126",
      appId: "1:813515230126:web:dde11175645257dc44d63f"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    db.enablePersistence().catch(err => { console.log("Offline mode error:", err.code); });

    // --- Global Variables ---
    let currentUser = null; 
    let timerInterval; 
    let currentTab = 'all';
    let editId = null; 
    let userLevel = 1;
    let selectedDateFilter = null; 
    let currentImageBase64 = null; 
    let isDoc = false;
    let userName = "User"; 
    let userAlarmSound = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
    let voiceAlarmEnabled = false; 
    let pomoInterval; 
    let pomoTime = 1500;
    let chartInstance = null;
    let focusAudio = new Audio();
    let currentCalMonth = new Date().getMonth(); 
    let currentCalYear = new Date().getFullYear();
    let deletedTaskTemp = null; 
    let deleteTimeout = null;
    let wakeLock = null; 
    let activeTagFilter = ""; 
    let waterCount = 0;
    let mediaRecorder; 
    let audioChunks = [];
    let voiceMemoBase64 = null;
    let isProUser = false; 
    let appPinCode = localStorage.getItem("appPin") || null;
    let currentEnteredPin = "";
    let isMusicPlaying = false;
    let syncTimeout = null;
    let calView = 'month'; // 'month' | 'week' | 'agenda'
    let reportPeriod = 'week'; // 'week' | 'month'
    let currentWeekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; })();

    // --- Navigation ---
    function switchPage(pageId) {
        document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const pageEl = document.getElementById('page-' + pageId);
        if (!pageEl) return;
        pageEl.classList.add('active');

        // Sub-pages show "More" as active nav
        const navId = ['finance','student','journal'].includes(pageId) ? 'more' : pageId;
        const navEl = document.getElementById('nav-' + navId);
        if (navEl) navEl.classList.add('active');

        if(pageId === 'add') loadDraft();
        if(pageId === 'home') {
            document.getElementById("taskInput").value = "";
            document.getElementById("notesInput").innerHTML = ""; 
            document.getElementById("timeInput").value = ""; 
            document.getElementById("repeatInput").value = "none"; 
            document.getElementById("priorityInput").value = "medium"; 
            document.getElementById("tagsInput").value = ""; 
            document.getElementById("subtasksContainer").innerHTML = ""; 
            removeImage(); 
            removeVoiceMemo();
            document.getElementById("assigneeInput").value = "";
            editId = null; 
            document.getElementById("customRepeatUI").style.display = "none"; 
            document.getElementById("submitBtn").innerText = "Save Task"; 
            document.getElementById("modalTitle").innerText = "New Task";
            document.getElementById("preAlarmInput").value = "0";
            document.getElementById("categoryOverrideInput").value = "";
            updateCategoryPreview();
        }
        if (pageId === 'finance') { renderFinanceDashboard(); setFinTab('expenses'); }
        if (pageId === 'student') { renderExamCountdowns(); renderSubjects(); updateStudySubjectSelect(); }
        if (pageId === 'journal') {
            document.getElementById('journalTodayLabel').innerText = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
            renderJournalEntries();
            loadTodayJournalEntry();
        }
    }

    // --- Initialization ---
    window.addEventListener('load', () => {
        setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            splash.style.opacity = '0';
            setTimeout(() => { 
                splash.style.display = 'none'; 
                if(appPinCode && localStorage.getItem("loggedIn") === "true") { 
                    document.getElementById("pinScreen").style.display = "flex"; 
                } else { 
                    checkMorningBriefing(); 
                }
            }, 500);
        }, 1500);
    });

    document.addEventListener("DOMContentLoaded", () => {
        applyTimeOfDayTheme(); 
        isProUser = localStorage.getItem("isPro") === "true";
        if(isProUser) { document.getElementById("proBadgeDisplay").style.display = "inline-flex"; }
        if(appPinCode) document.getElementById("appLockToggle").checked = true;

        window.addEventListener('offline', () => { 
            document.getElementById("syncStatusText").innerText = "🚫 Offline Mode"; 
            showToast("Working in Offline Mode.", "error"); 
        });
              window.addEventListener('online', () => { 
            document.getElementById("syncStatusText").innerText = "☁️ Syncing..."; 
            showToast("Back online! Syncing...", "success"); 
            syncToCloud(); 
        });
        
        // પેજ ખુલે ત્યારે તરત જ લિસ્ટ અને કેલેન્ડર બતાવો
        loadReminders();
        renderHomeCalendar();
        renderProjectDropdown();
        renderMoodTracker();
        renderSleepTracker();
        renderTodayShiftWidget();
        setFontSize(localStorage.getItem("appFontSize") || "medium", false);
        document.getElementById("webhookUrlInput").value = localStorage.getItem("webhookUrl") || "";
        document.getElementById("gcalClientIdInput").value = localStorage.getItem("gcalClientId") || "";
        // Regenerate shift reminders daily
        const lastShiftSync = localStorage.getItem('lastShiftSync');
        const todayStr2 = getTodayStr();
        if (lastShiftSync !== todayStr2) {
            syncShiftReminders();
            localStorage.setItem('lastShiftSync', todayStr2);
        }
    });

    // --- App Lock ---
    function enterPin(num) {
        if(currentEnteredPin.length < 4) {
            currentEnteredPin += num;
            document.getElementById("dot" + currentEnteredPin.length).style.background = "var(--primary)";
            if(currentEnteredPin.length === 4) {
                setTimeout(() => {
                    if(currentEnteredPin === appPinCode) { 
                        document.getElementById("pinScreen").style.display = "none"; 
                        checkMorningBriefing(); 
                    } else { 
                        showToast("Incorrect PIN!", "error"); 
                        clearPin(); 
                    }
                }, 200);
            }
        }
    }
    
    function clearPin() { 
        currentEnteredPin = ""; 
        document.querySelectorAll(".pin-dot").forEach(d => d.style.background = "transparent"); 
    }
    
    function deletePin() { 
        if(currentEnteredPin.length > 0) { 
            document.getElementById("dot" + currentEnteredPin.length).style.background = "transparent"; 
            currentEnteredPin = currentEnteredPin.slice(0, -1); 
        } 
    }
    
    function toggleAppLockSetup() {
        const toggle = document.getElementById("appLockToggle");
        if(toggle.checked) {
            const pin = prompt("Enter a 4-digit PIN for App Lock:");
            if(pin && pin.length === 4 && !isNaN(pin)) { 
                appPinCode = pin; 
                localStorage.setItem("appPin", pin); 
                showToast("App Lock Enabled!", "success"); 
            } else { 
                toggle.checked = false; 
                showToast("Invalid PIN.", "error"); 
            }
        } else { 
            appPinCode = null; 
            localStorage.removeItem("appPin"); 
            showToast("App Lock Disabled", "info"); 
        }
    }

    // --- Premium Features ---
    function activatePro() {
        isProUser = true; 
        localStorage.setItem("isPro", "true");
        document.getElementById("proBadgeDisplay").style.display = "inline-flex";
        closeModal('proModal'); 
        showToast("🎉 Welcome to PRO!", "success");
    }

    function toggleMusicPanel() { 
        const p = document.getElementById("musicPanel"); 
        p.style.display = p.style.display === "block" ? "none" : "block"; 
    }
    
    function playFloatingAudio() {
        const src = document.getElementById("floatingSoundSelect").value;
        if(src === "none") { 
            focusAudio.pause(); 
            isMusicPlaying = false; 
            return; 
        }
        if(isMusicPlaying && focusAudio.src === src) { 
            focusAudio.pause(); 
            isMusicPlaying = false; 
        } else { 
            focusAudio.src = src; 
            focusAudio.loop = true; 
            focusAudio.play(); 
            isMusicPlaying = true; 
        }
    }

    // --- Morning Briefing ---
    function checkMorningBriefing() {
        // Bug Fix 5: Retry if Firebase auth hasn't resolved yet
        if(!currentUser) {
            setTimeout(checkMorningBriefing, 1000);
            return;
        }
        const today = getTodayStr();
        if(localStorage.getItem('lastBriefingDate') !== today) {
            const reminders = JSON.parse(localStorage.getItem("reminders")) || []; 
            const habits = JSON.parse(localStorage.getItem("habits")) || [];
            let todayPendingTasks = reminders.filter(r => r.status !== 'completed' && r.time.split('T')[0] === today).length;
            let pendingHabits = habits.filter(h => h.lastCheckIn !== today).length;
            document.getElementById("briefingTaskCount").innerText = todayPendingTasks; 
            document.getElementById("briefingHabitCount").innerText = pendingHabits;
            openModal('briefingModal'); 
            localStorage.setItem('lastBriefingDate', today);
        }
    }

    // --- Authentication ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user; 
            localStorage.setItem("loggedIn", "true");
            document.getElementById('authScreen').style.display = 'none'; 
            document.getElementById('mainApp').style.display = 'flex';
            switchPage('home');
            if(!appPinCode) showToast("Logged in! Ready.", "success"); 
            startCloudSync();
            loadSharedWithMe();
        } else {
            currentUser = null; 
            localStorage.setItem("loggedIn", "false");
            document.getElementById('authScreen').style.display = 'block'; 
            document.getElementById('mainApp').style.display = 'none';
        }
    });

    function loginWithGoogle() { 
        const provider = new firebase.auth.GoogleAuthProvider(); 
        auth.signInWithPopup(provider).then((result) => { 
            db.collection("users").doc(result.user.uid).set({ userName: result.user.displayName, userLevel: 1, habitXP_tasks: 0 }, { merge: true }); 
        }).catch(err => showToast(err.message, "error")); 
    }
    
    function registerUser() { 
        const email = document.getElementById("emailInput").value; 
        const password = document.getElementById("passwordInput").value; 
        if(!email || password.length < 6) return showToast("Enter valid email/password", "error"); 
        auth.createUserWithEmailAndPassword(email, password).then((u) => { 
            db.collection("users").doc(u.user.uid).set({ reminders: [], habits: [], userLevel: 1, habitXP_tasks: 0, userName: "User", alarmSound: userAlarmSound, voiceAlarm: false, dailyTaskGoal: 5 }); 
        }).catch((e) => showToast(e.message, "error")); 
    }
    
    function loginUser() { 
        const email = document.getElementById("emailInput").value; 
        const password = document.getElementById("passwordInput").value; 
        if(!email || !password) return showToast("Enter email and password", "error"); 
        auth.signInWithEmailAndPassword(email, password).catch((e) => showToast(e.message, "error")); 
    }
    
    function resetPassword() { 
        const email = document.getElementById("emailInput").value; 
        if(!email) return showToast("Enter your email address first!", "error"); 
        auth.sendPasswordResetEmail(email).then(() => { 
            showToast("Password reset link sent!", "success"); 
        }).catch((e) => showToast(e.message, "error")); 
    }
    
    function logoutUser() { 
        auth.signOut().then(() => { 
            showToast("Logged out.", "info"); 
            localStorage.clear(); 
            location.reload(); 
        }); 
    }

    // --- Cloud Syncing ---
    function startCloudSync() {
        if(!currentUser) return;
        db.collection("users").doc(currentUser.uid).onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                if(!doc.metadata.hasPendingWrites) {
                    localStorage.setItem("reminders", JSON.stringify(data.reminders || [])); 
                    localStorage.setItem("habits", JSON.stringify(data.habits || []));
                    localStorage.setItem("userLevel", data.userLevel || 1); 
                    localStorage.setItem("habitXP_tasks", data.habitXP_tasks || 0);
                    localStorage.setItem("dailyTaskGoal", data.dailyTaskGoal || 5);
                    userName = data.userName || "User"; 
                    userAlarmSound = data.alarmSound || "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
                    voiceAlarmEnabled = data.voiceAlarm || false;
                    if(data.waterDate === getTodayStr()) { 
                        waterCount = data.waterCount || 0; 
                    } else { 
                        waterCount = 0; 
                    } 
                    document.getElementById("waterIntake").innerText = waterCount;
                    if(data.theme) setThemeColor(data.theme.p, data.theme.ph, data.theme.b1, data.theme.b2, false);
                    if(data.customTemplates) localStorage.setItem("customTemplates", JSON.stringify(data.customTemplates));
                    if(data.projects) localStorage.setItem("projects", JSON.stringify(data.projects));
                    if(data.moodLog) localStorage.setItem("moodLog", JSON.stringify(data.moodLog));
                    if(data.sleepLog) localStorage.setItem("sleepLog", JSON.stringify(data.sleepLog));
                    if(data.webhookUrl !== undefined) localStorage.setItem("webhookUrl", data.webhookUrl);
                    if(data.gcalClientId !== undefined) localStorage.setItem("gcalClientId", data.gcalClientId);
                    if(data.appFontSize) localStorage.setItem("appFontSize", data.appFontSize);
                    if(data.shiftConfig) localStorage.setItem("shiftConfig", JSON.stringify(data.shiftConfig));
                    if(data.isProUser) { 
                        isProUser = true; 
                        localStorage.setItem("isPro", "true"); 
                        document.getElementById("proBadgeDisplay").style.display="inline-flex"; 
                    }
                    
                    document.getElementById("displayUserName").innerText = userName; 
                    document.getElementById("profileNameInput").value = userName;
                    document.getElementById("dailyGoalInput").value = data.dailyTaskGoal || 5;
                    document.getElementById("alarmSoundInput").value = userAlarmSound; 
                    document.getElementById("voiceAlarmToggle").checked = voiceAlarmEnabled;
                    document.getElementById("aiApiKeyInput").value = localStorage.getItem("geminiKey") || "";
                    document.getElementById("webhookUrlInput").value = localStorage.getItem("webhookUrl") || "";
                    document.getElementById("gcalClientIdInput").value = localStorage.getItem("gcalClientId") || "";
                    setFontSize(localStorage.getItem("appFontSize") || "medium", false);
                    renderSleepTracker();
                    renderTodayShiftWidget();
                    userLevel = data.userLevel || 1; 
                    
                    renderCustomTemplates();
                    renderProjectDropdown();
                    renderMoodTracker();
                    loadReminders(); 
                    loadHabits(); 
                    document.getElementById("syncStatusText").innerText = "☁️ Synced";
                }
            }
        });
    }

    function syncToCloud() {
        if(!currentUser) return;
        if(!navigator.onLine) return;
        document.getElementById("syncStatusText").innerText = "☁️ Saving...";
        
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            const dataToSave = {
                reminders: JSON.parse(localStorage.getItem("reminders")) || [], 
                habits: JSON.parse(localStorage.getItem("habits")) || [],
                userLevel: parseInt(localStorage.getItem("userLevel")) || 1, 
                habitXP_tasks: parseInt(localStorage.getItem("habitXP_tasks")) || 0,
                userName: userName, 
                alarmSound: userAlarmSound, 
                voiceAlarm: voiceAlarmEnabled, 
                theme: JSON.parse(localStorage.getItem("appTheme")) || null,
                customTemplates: JSON.parse(localStorage.getItem("customTemplates")) || [], 
                projects: JSON.parse(localStorage.getItem("projects")) || [],
                moodLog: JSON.parse(localStorage.getItem("moodLog")) || {},
                sleepLog: JSON.parse(localStorage.getItem("sleepLog")) || {},
                webhookUrl: localStorage.getItem("webhookUrl") || "",
                gcalClientId: localStorage.getItem("gcalClientId") || "",
                appFontSize: localStorage.getItem("appFontSize") || "medium",
                shiftConfig: JSON.parse(localStorage.getItem("shiftConfig") || 'null'),
                waterCount: waterCount, 
                waterDate: getTodayStr(), 
                isProUser: isProUser,
                dailyTaskGoal: parseInt(localStorage.getItem("dailyTaskGoal")) || 5
            };
            db.collection("users").doc(currentUser.uid).set(dataToSave, {merge: true}).then(() => { 
                document.getElementById("syncStatusText").innerText = "☁️ Synced"; 
            }).catch((e) => { 
                document.getElementById("syncStatusText").innerText = "⚠️ Sync Error"; 
            });
        }, 2000);
    }

    // --- Settings & UI Helpers ---
    function updateWater(val) { 
        waterCount += val; 
        if(waterCount < 0) waterCount = 0; 
        document.getElementById("waterIntake").innerText = waterCount; 
        if(val > 0 && waterCount === 8) showToast("Goal Reached! 🎉", "success"); 
        syncToCloud(); 
    }
    
    function setThemeColor(p, ph, b1, b2, sync=true) { 
        document.documentElement.style.setProperty('--primary', p); 
        document.documentElement.style.setProperty('--primary-hover', ph); 
        document.documentElement.style.setProperty('--bg-grad-1', b1); 
        document.documentElement.style.setProperty('--bg-grad-2', b2); 
        localStorage.setItem("appTheme", JSON.stringify({p, ph, b1, b2})); 
        if(sync) { 
            syncToCloud(); 
            showToast("Theme saved!", "success"); 
        } 
    }
    
    function applyTimeOfDayTheme() { 
        if (localStorage.getItem("darkMode") === "true") { 
            document.body.classList.add("dark-mode"); 
            return; 
        } 
        const savedTheme = JSON.parse(localStorage.getItem("appTheme")); 
        if(savedTheme) return; 
    }
    
    function saveProfileSettings() { 
        userName = document.getElementById("profileNameInput").value.trim() || "User";
        userAlarmSound = document.getElementById("alarmSoundInput").value; 
        voiceAlarmEnabled = document.getElementById("voiceAlarmToggle").checked; 
        localStorage.setItem("geminiKey", document.getElementById("aiApiKeyInput").value.trim());
        localStorage.setItem("webhookUrl", document.getElementById("webhookUrlInput").value.trim());
        localStorage.setItem("gcalClientId", document.getElementById("gcalClientIdInput").value.trim());
        const dGoal = parseInt(document.getElementById("dailyGoalInput").value) || 5;
        localStorage.setItem("dailyTaskGoal", dGoal);
        document.getElementById("displayUserName").innerText = userName;
        updateMiniDashboard(); 
        syncToCloud(); 
        showToast("Settings saved!", "success"); 
    }

    function openModal(modalId) { 
        document.getElementById(modalId).classList.add('active'); 
        if(modalId === 'analyticsModal') setTimeout(() => setReportPeriod(reportPeriod), 100); 
    }
    
    function closeModal(modalId) { 
        document.getElementById(modalId).classList.remove('active'); 
    }

    // --- Leaderboard ---
    function openLeaderboard() {
        openModal('leaderboardModal');
        const cont = document.getElementById("leaderboardContainer"); 
        cont.innerHTML = "<p style='text-align:center;'>Fetching...</p>";
        db.collection("users").orderBy("habitXP_tasks", "desc").limit(10).get().then((querySnapshot) => {
            let html = ""; 
            let rank = 1;
            let foundSelf = false;
            querySnapshot.forEach((doc) => {
                const data = doc.data(); 
                let trophy = rank === 1 ? "🥇" : (rank === 2 ? "🥈" : (rank === 3 ? "🥉" : "🏅"));
                const isMe = currentUser && doc.id === currentUser.uid;
                if (isMe) foundSelf = true;
                html += `<div style="padding:12px; background:${isMe ? '#e5f1ff' : '#ffffff'}; margin-bottom:8px; border-radius:12px; display:flex; justify-content:space-between; box-shadow:0 2px 4px rgba(0,0,0,0.02); ${isMe ? 'border:2px solid var(--primary);' : ''}"><span>${trophy} ${data.userName || "Unknown"}${isMe ? ' (You)' : ''}</span><span style="font-weight:700; color:var(--primary);">${(data.habitXP_tasks||0)*10} XP</span></div>`;
                rank++;
            }); 
            cont.innerHTML = html || "<p>No data found.</p>";
            if (!foundSelf && currentUser) {
                const myXP = (parseInt(localStorage.getItem('habitXP_tasks')) || 0) * 10;
                cont.innerHTML += `<div style="margin-top:10px; padding:12px; background:#fff8e8; border-radius:12px; display:flex; justify-content:space-between; border:2px dashed #ff9500;"><span>🎯 You (not in top 10)</span><span style="font-weight:700; color:#ff9500;">${myXP} XP</span></div>`;
            }
        });
    }

    // --- Full Calendar ---
    function formatDateLocal(d) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function setCalView(view) {
        calView = view;
        document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('calview-' + view).classList.add('active');
        renderHomeCalendar();
    }

    function changeHomeMonth(dir) { 
        if (calView === 'week' || calView === 'agenda') {
            currentWeekStart.setDate(currentWeekStart.getDate() + dir*7);
        } else {
            currentCalMonth += dir; 
            if(currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; } 
            if(currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; } 
        }
        renderHomeCalendar(); 
        if(currentTab === 'upcoming') loadReminders(); 
    }

    function renderHomeCalendar() {
        const displayEl = document.getElementById("homeCalMonthDisplay");
        if(!displayEl) return;

        const weekdaysRow = document.getElementById("calWeekdaysRow");
        const grid = document.getElementById("homeCalendarGrid");
        const agendaContainer = document.getElementById("agendaListContainer");

        if (calView === 'agenda') {
            weekdaysRow.style.display = 'none';
            grid.style.display = 'none';
            agendaContainer.style.display = 'block';
            renderAgendaView(displayEl, agendaContainer);
            document.getElementById("clearFilterWrapper").style.display = "none";
            return;
        }

        weekdaysRow.style.display = '';
        grid.style.display = '';
        agendaContainer.style.display = 'none';

        if (calView === 'week') {
            renderWeekView(displayEl, grid);
        } else {
            renderMonthView(displayEl, grid);
        }
    }

    function renderMonthView(displayEl, grid) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        displayEl.innerText = `${monthNames[currentCalMonth]} ${currentCalYear}`; 
        grid.innerHTML = "";
        
        let firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
        let daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
        
        const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        const taskDates = reminders.filter(r => r.status !== 'completed' && !r.archived).map(r => r.time.split('T')[0]);
        
        for(let i=0; i<firstDay; i++) { 
            grid.innerHTML += `<div class="cal-day empty"></div>`; 
        }
        
        const todayStr = getTodayStr();
        for(let i=1; i<=daysInMonth; i++) {
            const dStr = `${currentCalYear}-${(currentCalMonth+1).toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
            const hasTask = taskDates.includes(dStr); 
            const isToday = dStr === todayStr;
            const isSelected = selectedDateFilter === dStr;
            
            let classes = "cal-day";
            if(isToday) classes += " today";
            if(hasTask) classes += " has-event";
            if(isSelected) classes += " selected";
            
            grid.innerHTML += `<div class="${classes}" onclick="filterByDate('${dStr}')">${i}</div>`;
        }
        
        // જો કોઈ તારીખ સિલેક્ટ કરેલી હોય અથવા કેલેન્ડરનો મહિનો હાલના મહિના કરતાં અલગ હોય, તો જ Clear બટન બતાવો 
        const isFilterActive = selectedDateFilter || currentCalMonth !== new Date().getMonth() || currentCalYear !== new Date().getFullYear();
        document.getElementById("clearFilterWrapper").style.display = isFilterActive ? "flex" : "none";
    }

    function renderWeekView(displayEl, grid) {
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const start = new Date(currentWeekStart);
        const end = new Date(start); end.setDate(end.getDate() + 6);
        displayEl.innerText = (start.getMonth() === end.getMonth())
            ? `${monthNames[start.getMonth()]} ${start.getDate()}–${end.getDate()}`
            : `${monthNames[start.getMonth()]} ${start.getDate()} – ${monthNames[end.getMonth()]} ${end.getDate()}`;
        grid.innerHTML = "";

        const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        const taskDates = reminders.filter(r => r.status !== 'completed' && !r.archived).map(r => r.time.split('T')[0]);
        const todayStr = getTodayStr();

        for(let i=0; i<7; i++) {
            const d = new Date(start); d.setDate(start.getDate() + i);
            const dStr = formatDateLocal(d);
            const hasTask = taskDates.includes(dStr);
            const isToday = dStr === todayStr;
            const isSelected = selectedDateFilter === dStr;
            let classes = "cal-day";
            if(isToday) classes += " today";
            if(hasTask) classes += " has-event";
            if(isSelected) classes += " selected";
            grid.innerHTML += `<div class="${classes}" onclick="filterByDate('${dStr}')">${d.getDate()}</div>`;
        }

        document.getElementById("clearFilterWrapper").style.display = selectedDateFilter ? "flex" : "none";
    }

    function renderAgendaView(displayEl, container) {
        displayEl.innerText = "📋 Agenda (Next 14 Days)";
        const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const windowEnd = new Date(todayStart); windowEnd.setDate(windowEnd.getDate() + 14);

        const upcoming = reminders.filter(r => {
            if (r.status === 'completed' || r.archived) return false;
            const t = new Date(r.time);
            return t >= todayStart && t < windowEnd;
        }).sort((a,b) => new Date(a.time) - new Date(b.time));

        if (upcoming.length === 0) {
            container.innerHTML = `<div class="agenda-empty">🎉 No upcoming tasks in next 14 days!</div>`;
            return;
        }

        const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const todayStr = getTodayStr();
        let html = "";
        let lastDateStr = "";
        upcoming.forEach(r => {
            const t = new Date(r.time);
            const dStr = formatDateLocal(t);
            if (dStr !== lastDateStr) {
                const label = dStr === todayStr ? "Today" : `${dayNames[t.getDay()]}, ${monthNames[t.getMonth()]} ${t.getDate()}`;
                html += `<div class="agenda-date-header">${label}</div>`;
                lastDateStr = dStr;
            }
            const prioColor = r.priority === 'high' ? '#ff3b30' : r.priority === 'low' ? '#34c759' : '#ff9500';
            const timeStr = t.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
            html += `<div class="agenda-item"><span class="agenda-dot" style="background:${prioColor};"></span><span class="agenda-time">${timeStr}</span><span style="flex:1;">${r.task}</span></div>`;
        });
        container.innerHTML = html;
    }

    // Bug Fix 3: Duplicate filterByDate removed — complete version kept below (line ~2394)

      function clearCalendarFilter() {
        selectedDateFilter = null;
        currentCalMonth = new Date().getMonth(); 
        currentCalYear = new Date().getFullYear();
        currentWeekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; })();
        renderHomeCalendar(); // મહિનો રિસેટ કર્યા પછી તરત કેલેન્ડર દોરો
        changeTab('all'); // ક્લિયર કર્યા પછી બધા ટાસ્ક બતાવો
        loadReminders();
    }

    // --- Pomodoro Focus Timer ---
    function toggleZenMode() { 
        document.body.classList.toggle("zen-mode"); 
    }
    
    function updatePomoDisplay() { 
        document.getElementById("pomodoroDisplay").innerText = `${Math.floor(pomoTime / 60).toString().padStart(2, '0')}:${(pomoTime % 60).toString().padStart(2, '0')}`; 
    }
    
    function openPomoModal() {
        const select = document.getElementById("pomoTaskSelect");
        let html = `<option value="">🎯 Select Task (Optional)</option>`;
        const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        reminders.filter(r => r.status === 'pending').forEach(r => { 
            html += `<option value="${r.id}">${r.task}</option>`; 
        });
        select.innerHTML = html; 
        openModal('pomodoroModal');
    }
    
    function resetPomo() { 
        clearInterval(pomoInterval); 
        focusAudio.pause(); 
        pomoTime = parseInt(document.getElementById("pomoTimeSelect").value) || 1500; 
        updatePomoDisplay(); 
        if (wakeLock !== null) { 
            wakeLock.release().then(() => wakeLock = null); 
        } 
    }
    
    async function startPomo() { 
        clearInterval(pomoInterval);
        try { 
            if ('wakeLock' in navigator) { 
                wakeLock = await navigator.wakeLock.request('screen'); 
            } 
        } catch (err) {}
        
        pomoInterval = setInterval(() => { 
            pomoTime--; 
            updatePomoDisplay(); 
            if(pomoTime <= 0) { 
                clearInterval(pomoInterval); 
                focusAudio.pause(); 
                playAlarm(); 
                if (wakeLock !== null) { 
                    wakeLock.release().then(() => wakeLock = null); 
                }
                showToast("Focus Session Complete! ☕", "success"); 
                resetPomo(); 
                const selectedTaskId = document.getElementById("pomoTaskSelect").value;
                if(selectedTaskId) { 
                    if(confirm("Session finished! Did you complete the task?")) { 
                        toggleStatus(Number(selectedTaskId)); 
                    } 
                }
            } 
        }, 1000);
    }
    
    function pausePomo() { 
        clearInterval(pomoInterval); 
        focusAudio.pause(); 
        if (wakeLock !== null) { 
            wakeLock.release().then(() => wakeLock = null); 
        } 
    }

    // --- AI Features (Gemini Integration) ---
    async function aiGenerateSubtasks() {
        const apiKey = document.getElementById("aiApiKeyInput").value.trim() || localStorage.getItem("geminiKey"); 
        const taskName = document.getElementById("taskInput").value.trim();
        if(!taskName) return showToast("Enter Task Title first!", "error"); 
        if(!apiKey) { 
            switchPage('settings'); 
            return showToast("Paste Free API Key!", "error"); 
        }
        showToast("🪄 AI is planning...", "info");
        try {
            const prompt = `Break down the goal "${taskName}" into 3 to 4 short steps. Output ONLY a valid JSON array of strings. Example: ["Step 1", "Step 2"]`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
            });
            const data = await response.json(); 
            if(data.error) throw new Error(data.error.message);
            let text = data.candidates[0].content.parts[0].text; 
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            JSON.parse(text).forEach(sub => addSubtaskField(sub, false)); 
            showToast("🪄 Auto-Plan Complete!", "success");
        } catch(e) { 
            showToast("AI Error.", "error"); 
        }
    }
    
    async function aiSuggestTime() {
        const apiKey = document.getElementById("aiApiKeyInput").value.trim() || localStorage.getItem("geminiKey"); 
        const taskName = document.getElementById("taskInput").value.trim();
        if(!taskName) return showToast("Enter Task Title!", "error"); 
        if(!apiKey) { 
            switchPage('settings'); 
            return showToast("Paste Free API Key!", "error"); 
        }
        showToast("🪄 AI is thinking...", "info");
        try {
            const now = new Date();
            const prompt = `Task: "${taskName}". Current time: ${now.toISOString()}. Suggest a logical future date/time. Respond ONLY with format: YYYY-MM-DDTHH:mm.`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
            });
            const data = await response.json(); 
            if(data.error) throw new Error(data.error.message);
            let aiTime = data.candidates[0].content.parts[0].text.trim(); 
            document.getElementById("timeInput").value = aiTime; 
            showToast("🪄 Time set!", "success");
        } catch(e) { 
            showToast("AI Error.", "error"); 
        }
    }
    
    async function generateAIReview() {
        const apiKey = document.getElementById("aiApiKeyInput").value.trim() || localStorage.getItem("geminiKey");
        if(!apiKey) { 
            switchPage('settings'); 
            return showToast("Paste API Key first!", "error"); 
        }
        const outputDiv = document.getElementById("aiReviewOutput"); 
        outputDiv.innerText = "🪄 Analyzing...";
        try {
            const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
            const comp = reminders.filter(r => r.status === "completed").length; 
            const pend = reminders.length - comp; 
            const xp = localStorage.getItem("habitXP_tasks") || "0";
            const prompt = `Act as a coach. Completed: ${comp}, Pending: ${pend}, XP: ${xp}. Write a punchy 2-sentence review with emojis.`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
            });
            const data = await response.json(); 
            if(data.error) throw new Error(data.error.message);
            outputDiv.innerText = data.candidates[0].content.parts[0].text.trim(); 
            showToast("Review Generated!", "success");
        } catch(e) { 
            outputDiv.innerText = "Error checking API Key."; 
        }
    }
    
    async function startSmartVoiceAssistant() {
        const apiKey = document.getElementById("aiApiKeyInput").value.trim() || localStorage.getItem("geminiKey");
        if(!apiKey) { 
            switchPage('settings'); 
            return showToast("Paste API Key first!", "error"); 
        }
        if (!('webkitSpeechRecognition' in window)) return showToast("Not supported.", "error");
        
        const rec = new webkitSpeechRecognition(); 
        rec.lang = 'en-IN'; 
        rec.onstart = function() { showToast("Listening... 🎙️", "info"); };
        rec.onresult = async function(event) { 
            const text = event.results[0][0].transcript;
            showToast("Processing...", "info"); 
            try {
                const now = new Date().toISOString();
                const prompt = `Extract info: "${text}". Current: ${now}. Return ONLY JSON: "task" (str), "time" (YYYY-MM-DDTHH:mm), "priority" (high/medium/low).`;
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({contents: [{parts:[{text: prompt}]}]}) 
                });
                const data = await res.json(); 
                let result = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim(); 
                const parsed = JSON.parse(result);
                let rems = JSON.parse(localStorage.getItem("reminders")) || [];
                rems.push({ 
                    id: Date.now(), 
                    task: parsed.task, 
                    time: parsed.time, 
                    priority: parsed.priority || 'medium', 
                    preAlarm: 0, 
                    assignee: "", 
                    notes: "", 
                    status: "pending", 
                    notified: false, 
                    repeat: "none", 
                    category: autoCategorizeTask(parsed.task) 
                });
                localStorage.setItem("reminders", JSON.stringify(rems)); 
                syncToCloud(); 
                loadReminders(); 
                showToast("Auto-Added! ✅", "success");
            } catch(err) { 
                showToast("AI could not understand.", "error"); 
            }
        }; 
        rec.start();
    }

    // --- Subtasks Handling ---
    function addSubtaskField(val = "", done = false) {
        const cont = document.getElementById("subtasksContainer");
        const id = Date.now() + Math.random(); 
        const div = document.createElement("div"); 
        div.style.display = "flex"; 
        div.style.gap="10px"; 
        div.style.marginBottom="10px"; 
        div.className="subtask-item";
        div.innerHTML = `<input type="checkbox" class="subtask-checkbox" style="width:20px;height:20px;" ${done ? 'checked' : ''} id="cb_${id}">
                         <input type="text" style="flex:1; margin:0; padding:8px 12px; border-radius:10px; border:1px solid #e5e5ea;" class="subtask-inp" placeholder="Sub-task..." value="${val}" id="inp_${id}">
                         <button style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:10px; padding:8px; cursor:pointer;" onclick="this.parentElement.remove()">✖</button>`; 
        cont.appendChild(div);
    }
    
    function getSubtasksFromForm() { 
        let subs = []; 
        document.querySelectorAll(".subtask-item").forEach(item => { 
            const val = item.querySelector(".subtask-inp").value.trim(); 
            if(val) subs.push({ text: val, done: item.querySelector(".subtask-checkbox").checked }); 
        }); 
        return subs; 
    }
    
    function toggleSubtaskLocal(taskId, subIndex, checkbox) {
        let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        reminders = reminders.map(r => { 
            if(r.id === taskId && r.subtasks && r.subtasks[subIndex]) r.subtasks[subIndex].done = checkbox.checked; 
            return r; 
        });
        localStorage.setItem("reminders", JSON.stringify(reminders)); 
        syncToCloud(); 
        loadReminders(); 
    }

    // --- Productivity Chart ---
    function renderChart(period) {
        period = period || reportPeriod;
        const rems = JSON.parse(localStorage.getItem("reminders")) || []; 
        const days = period === 'month' ? 30 : 7;
        const dateArr = [...Array(days)].map((_, i) => { 
            const d = new Date(); 
            d.setDate(d.getDate() - (days - 1 - i)); 
            return formatDateLocal(d); 
        });
        const dataCounts = dateArr.map(date => rems.filter(r => r.time.split('T')[0] === date && r.status === 'completed').length);
        
        const ctx = document.getElementById('productivityChart').getContext('2d'); 
        if(chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, { 
            type: 'bar', 
            data: { 
                labels: dateArr.map(d => d.slice(5)), 
                datasets: [{ label: 'Tasks', data: dataCounts, backgroundColor: '#34c759', borderRadius: 8 }] 
            }, 
            options: { 
                scales: { 
                    y: { beginAtZero: true, ticks: { stepSize: period === 'month' ? undefined : 1 } },
                    x: { ticks: { maxTicksLimit: period === 'month' ? 10 : 7 } }
                } 
            } 
        });
    }

    // ============================================================
    // BATCH 2 — WEEKLY/MONTHLY REPORT EXTENDED STATS
    // ============================================================
    function setReportPeriod(period) {
        reportPeriod = period;
        document.querySelectorAll('.report-toggle button').forEach(b => b.classList.remove('active'));
        document.getElementById('reportBtn-' + period).classList.add('active');
        renderChart(period);
        renderExtendedReportStats(period);
        renderProductivityHeatmap();
        renderGoalPrediction(period);
    }

    function renderExtendedReportStats(period) {
        const container = document.getElementById('extendedReportStats');
        if (!container) return;
        const days = period === 'month' ? 30 : 7;
        const periodLabel = period === 'month' ? 'this month' : 'this week';

        const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const moodLog = JSON.parse(localStorage.getItem('moodLog')) || {};
        const sleepLog = JSON.parse(localStorage.getItem('sleepLog')) || {};
        const habits = JSON.parse(localStorage.getItem('habits')) || [];

        const dateArr = [...Array(days)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (days - 1 - i));
            return formatDateLocal(d);
        });
        const dateSet = new Set(dateArr);

        const dueInPeriod = reminders.filter(r => dateSet.has(r.time.split('T')[0]));
        const completedInPeriod = dueInPeriod.filter(r => r.status === 'completed');
        const completionRate = dueInPeriod.length > 0 ? Math.round((completedInPeriod.length / dueInPeriod.length) * 100) : 0;

        const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const countByDate = {};
        completedInPeriod.forEach(r => {
            const d = r.time.split('T')[0];
            countByDate[d] = (countByDate[d]||0) + 1;
        });
        let bestDayLabel = '—', bestCount = 0, bestDayDate = null;
        Object.entries(countByDate).forEach(([d,c]) => { if(c > bestCount) { bestCount = c; bestDayDate = d; } });
        if (bestDayDate) {
            const bd = new Date(bestDayDate + 'T00:00:00');
            bestDayLabel = `${dayNames[bd.getDay()]} (${bestCount} tasks)`;
        }

        const moodEmojis = ['😄','😊','😐','😔','😢'];
        const moodVals = dateArr.map(d => moodLog[d]).filter(v => v !== undefined);
        let moodAvgLabel = 'No data';
        if (moodVals.length > 0) {
            const avg = moodVals.reduce((a,b)=>a+b,0) / moodVals.length;
            moodAvgLabel = `${moodEmojis[Math.round(avg)]} (${moodVals.length}/${days} days logged)`;
        }

        const sleepVals = dateArr.map(d => sleepLog[d]).filter(v => v !== undefined);
        let sleepAvgLabel = 'No data';
        if (sleepVals.length > 0) {
            const avg = sleepVals.reduce((a,b)=>a+b,0) / sleepVals.length;
            sleepAvgLabel = `${avg.toFixed(1)}h avg (${sleepVals.length}/${days} days)`;
        }

        let habitHtml = '<span style="color:#8e8e93; font-size:12px;">No habits tracked</span>';
        if (habits.length > 0) {
            habitHtml = habits.map(h => `<span style="display:inline-block; background:#fff; padding:4px 10px; border-radius:8px; font-size:12px; font-weight:700; margin:2px 4px 2px 0;">🔥 ${h.name}: ${h.streak}</span>`).join('');
        }

        container.innerHTML = `
            <div class="report-stat-row">
                <span style="font-size:13px; font-weight:600;">✅ Completion Rate (${periodLabel})</span>
                <span style="font-weight:800; color:var(--primary);">${completionRate}%</span>
            </div>
            <div class="report-bar-track"><div class="report-bar-fill" style="width:${completionRate}%; background:var(--primary);"></div></div>

            <div class="report-stat-row" style="margin-top:10px;">
                <span style="font-size:13px; font-weight:600;">🏆 Best Day</span>
                <span style="font-weight:700;">${bestDayLabel}</span>
            </div>
            <div class="report-stat-row">
                <span style="font-size:13px; font-weight:600;">😊 Avg Mood</span>
                <span style="font-weight:700;">${moodAvgLabel}</span>
            </div>
            <div class="report-stat-row" style="border-bottom:none;">
                <span style="font-size:13px; font-weight:600;">😴 Avg Sleep</span>
                <span style="font-weight:700;">${sleepAvgLabel}</span>
            </div>

            <div style="margin-top:12px;">
                <p style="font-size:11px; color:#8e8e93; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 8px;">🔥 Habit Streaks</p>
                ${habitHtml}
            </div>
        `;
    }

    // --- Utility Functions ---
    function showToast(message, type = 'info') { 
        const container = document.getElementById("toastContainer");
        const toast = document.createElement("div"); 
        toast.className = `toast ${type}`; 
        let icon = type === "success" ? "✅" : (type === "error" ? "⚠️" : "💡");
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`; 
        container.appendChild(toast); 
        setTimeout(() => toast.remove(), 3000);
    }
    
    function toggleTheme() { 
        const isDark = document.body.classList.toggle("dark-mode"); 
        localStorage.setItem("darkMode", isDark); 
        document.getElementById("themeToggleBtn").innerText = isDark ? "☀️" : "🌙"; 
    }
    
    function getTodayStr() { 
        const today = new Date(); 
        return (new Date(today - today.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; 
    }
    
    function getYesterdayStr() { 
        const yesterday = new Date(); 
        yesterday.setDate(yesterday.getDate() - 1); 
        return (new Date(yesterday - yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0]; 
    }
    
       function toggleCustomRepeat() { 
        const val = document.getElementById("repeatInput").value; 
        const ui = document.getElementById("customRepeatUI");
        const typeSelect = document.getElementById("customRepeatType");
        
        if(val === "custom") { 
            ui.style.display = "block"; 
            if(typeSelect.value === "hours") typeSelect.value = "days"; // Custom માટે default Days રાખો
        } else if (val === "hourly") {
            ui.style.display = "block"; 
            typeSelect.value = "hours"; // Hourly માટે Hours લોક કરો
        } else { 
            ui.style.display = "none"; 
        } 
    }
 
    function loadDraft() { 
        if(editId) return; 
        const draft = JSON.parse(localStorage.getItem("taskDraft"));
        if(draft) { 
            if(!document.getElementById("taskInput").value) document.getElementById("taskInput").value = draft.task || ""; 
            if(!document.getElementById("notesInput").innerHTML) document.getElementById("notesInput").innerHTML = draft.notes || ""; 
        } 
    }

    // --- Voice Memo Attachments ---
    function toggleVoiceMemo() {
        const btn = document.getElementById("recordBtn");
        if(!mediaRecorder || mediaRecorder.state === "inactive") {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                mediaRecorder = new MediaRecorder(stream); 
                mediaRecorder.start(); 
                audioChunks = [];
                btn.innerHTML = "⏹️ Stop Recording..."; 
                btn.style.background = "#ff3b30"; 
                btn.style.color = "white";
                
                mediaRecorder.addEventListener("dataavailable", event => { 
                    audioChunks.push(event.data); 
                });
                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); 
                    const reader = new FileReader(); 
                    reader.readAsDataURL(audioBlob); 
                    reader.onloadend = function() { 
                        voiceMemoBase64 = reader.result; 
                        document.getElementById("voiceMemoAudio").src = voiceMemoBase64; 
                        document.getElementById("voiceMemoPreviewContainer").style.display = "flex"; 
                        showToast("Saved!", "success"); 
                    }
                });
            }).catch(e => showToast("Mic denied.", "error"));
        } else { 
            mediaRecorder.stop(); 
            btn.innerHTML = "🔴 Voice Memo"; 
            btn.style.background = "rgba(255,59,48,0.1)"; 
            btn.style.color = "#ff3b30"; 
            mediaRecorder.stream.getTracks().forEach(t => t.stop()); 
        }
    }
    
    function removeVoiceMemo() { 
        voiceMemoBase64 = null; 
        document.getElementById("voiceMemoPreviewContainer").style.display = "none"; 
    }

    // --- Image & Document Attachments ---
    function handleImageUpload(event) {
        const file = event.target.files[0]; 
        if(!file) return;
        if(file.size > 2 * 1024 * 1024) return showToast("File too large! Max 2MB allowed.", "error"); 
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if(file.type.startsWith('image/')) {
                isDoc = false;
                const img = new Image(); 
                img.onload = function() {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 500; 
                    let scaleSize = 1; 
                    if(img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
                    
                    canvas.width = img.width * scaleSize; 
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext("2d"); 
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    currentImageBase64 = canvas.toDataURL("image/jpeg", 0.7);
                    document.getElementById("imagePreview").src = currentImageBase64; 
                    document.getElementById("imagePreview").style.display = "block"; 
                    document.getElementById("docPreview").style.display = "none"; 
                    document.getElementById("imagePreviewContainer").style.display = "block";
                }
                img.src = e.target.result;
            } else { 
                isDoc = true; 
                currentImageBase64 = e.target.result; 
                document.getElementById("imagePreview").style.display = "none"; 
                document.getElementById("docPreview").style.display = "block"; 
                document.getElementById("imagePreviewContainer").style.display = "block"; 
            }
        }
        reader.readAsDataURL(file);
    }
    
    function removeImage() { 
        currentImageBase64 = null; 
        isDoc = false; 
        document.getElementById("imagePreviewContainer").style.display = "none"; 
        document.getElementById("imageUpload").value = ""; 
    }

    // --- Location Attachment ---
    function attachLocation() {
        if (navigator.geolocation) {
            showToast("Fetching Location...", "info");
            navigator.geolocation.getCurrentPosition((pos) => {
                const link = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                document.getElementById("notesInput").innerHTML += `<br><a href="${link}" target="_blank" style="background:#34c759; color:white; padding:4px 8px; border-radius:8px; text-decoration:none; font-size:12px;">📍 View Location</a>`;
                showToast("Location attached!", "success");
            }, () => showToast("Denied.", "error"));
        } else { 
            showToast("Not supported.", "error"); 
        }
    }

    // --- Categorization ---
    function autoCategorizeTask(taskName) {
        const lowerTask = taskName.toLowerCase();
        if (/call|contact|phone|ring/.test(lowerTask)) return { name: "Call", icon: "📞" };
        if (/buy|shop|grocery|milk|bread|mall|market/.test(lowerTask)) return { name: "Shopping", icon: "🛒" };
        if (/doctor|pill|medicine|workout|gym|clinic|health|water/.test(lowerTask)) return { name: "Health", icon: "🏥" };
        if (/meet|zoom|boss|project|office|email|work|code|sync/.test(lowerTask)) return { name: "Work", icon: "💻" };
        if (/pay|bank|money|bill|salary|rent|finance/.test(lowerTask)) return { name: "Finance", icon: "💰" };
        if (/read|study|book|exam|homework|assignment|test/.test(lowerTask)) return { name: "Study", icon: "📚" };
        return { name: "Task", icon: "📝" }; 
    }

    // --- Custom Templates ---
    function saveCustomTemplate() {
        const t = document.getElementById("taskInput").value.trim();
        if(!t) return showToast("Enter title first!", "error");
        let temps = JSON.parse(localStorage.getItem("customTemplates")) || [];
        temps.push({ 
            title: t, 
            notes: document.getElementById("notesInput").innerHTML, 
            rep: document.getElementById("repeatInput").value, 
            pri: document.getElementById("priorityInput").value 
        }); 
        localStorage.setItem("customTemplates", JSON.stringify(temps)); 
        renderCustomTemplates(); 
        syncToCloud(); 
        showToast("Saved!", "success");
    }
    function renderCustomTemplates() {
        const group = document.getElementById("customSavedTemplatesGroup");
        if(!group) return;
        const temps = JSON.parse(localStorage.getItem("customTemplates")) || [];
        let html = '';
        temps.forEach((t, i) => { 
            html += `<option value="custom_${i}">⭐ ${t.title}</option>`; 
        }); 
        group.innerHTML = html;
    }

    function applyQuickTemplate() {
        const select = document.getElementById("quickTemplateSelect");
        const val = select.value;
        if(!val) return;

        // Custom saved templates handling
        if(val.startsWith("custom_")) {
            const index = parseInt(val.split("_")[1]);
            const temps = JSON.parse(localStorage.getItem("customTemplates")) || [];
            const t = temps[index];
            if(t) {
                document.getElementById("taskInput").value = t.title;
                document.getElementById("notesInput").innerHTML = t.notes || ""; 
                document.getElementById("repeatInput").value = t.rep || "none"; 
                document.getElementById("priorityInput").value = t.pri || "medium"; 
                toggleCustomRepeat();
                
                const now = new Date(); now.setHours(now.getHours() + 1);
                const tzoffset = now.getTimezoneOffset() * 60000; 
                document.getElementById("timeInput").value = (new Date(now - tzoffset)).toISOString().slice(0, 16);
            }
            select.value = ""; 
            return;
        }

        // Default predefined templates logic
        const templates = {
            "Birthday": { rep: "yearly", pri: "high" },
            "Anniversary": { rep: "yearly", pri: "high" },
            "Other": { rep: "none", pri: "medium" },
            "Water": { rep: "hourly", pri: "medium" },
            "Food": { rep: "daily", pri: "medium" },
            "Wakeup": { rep: "daily", pri: "high" },
            "Sleeping": { rep: "daily", pri: "medium" },
            "Reading": { rep: "daily", pri: "low" },
            "GYM": { rep: "daily", pri: "medium" },
            "Walking": { rep: "daily", pri: "low" },
            "Running": { rep: "daily", pri: "medium" },
            "Bill": { rep: "monthly", pri: "high" },
            "Rent": { rep: "monthly", pri: "high" },
            "EMI": { rep: "monthly", pri: "high" },
            "Event": { rep: "none", pri: "medium" },
            "Appointment": { rep: "none", pri: "high" }
        };

        const t = templates[val];
        if(t) {
            document.getElementById("taskInput").value = val;
            document.getElementById("repeatInput").value = t.rep;
            document.getElementById("priorityInput").value = t.pri;
            
            // જો Water સિલેક્ટ કરે તો 1 કલાકનું રિપીટ સેટ થઈ જશે 
            if(t.rep === 'hourly') {
                document.getElementById("customRepeatType").value = "hours";
                document.getElementById("customRepeatInterval").value = "1";
            }
            
            toggleCustomRepeat();
            removeImage(); 
            removeVoiceMemo(); 
            
            const now = new Date(); now.setHours(now.getHours() + 1);
            const tzoffset = now.getTimezoneOffset() * 60000; 
            document.getElementById("timeInput").value = (new Date(now - tzoffset)).toISOString().slice(0, 16);
        }
        
        select.value = ""; // ઓટો-ફિલ થયા પછી સિલેક્ટ બોક્સ ફરીથી ખાલી થઈ જશે 
    }

    // --- Analytics & Gamification ---
    function openAnalyticsModal() {
        const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        document.getElementById("statTotalTasks").innerText = reminders.length; 
        document.getElementById("statCompletedTasks").innerText = reminders.filter(r => r.status === "completed").length;
        openModal('analyticsModal');
    }

    function updateMiniDashboard() {
        const reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        const habits = JSON.parse(localStorage.getItem("habits")) || []; 
        const todayStr = getTodayStr(); 
        const tomorrow = new Date(); 
        tomorrow.setHours(0,0,0,0); 
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let todayPendingTasks = 0; 
        let todayCompletedTasks = 0;
        
        reminders.forEach(r => { 
            const rDate = new Date(r.time);
            if (r.status !== "completed") { 
                if (rDate < tomorrow) todayPendingTasks++; 
            } else { 
                if(r.time.split('T')[0] === todayStr) todayCompletedTasks++; 
            }
        });
        
        document.getElementById("widgetTasksToday").innerText = `${todayPendingTasks}`; 
        document.getElementById("widgetHabitsToday").innerText = `${habits.filter(h => h.lastCheckIn !== todayStr).length} Habits Pending`;
        
        let dailyGoal = parseInt(localStorage.getItem("dailyTaskGoal")) || 5;
        let goalPct = Math.min((todayCompletedTasks / dailyGoal) * 100, 100);
        document.getElementById("widgetGoalText").innerText = `${todayCompletedTasks}/${dailyGoal} Done`;
        document.getElementById("widgetGoalFill").style.width = `${goalPct}%`;
    }
    
    function updateAnalyticsAndGamification() {
        const reminders = JSON.parse(localStorage.getItem("reminders"))||[];
        const completedReminders = reminders.filter(r => r.status === "completed").length; 
        const totalTasks = reminders.length;
        let percentage = totalTasks > 0 ? Math.round((completedReminders / totalTasks) * 100) : 0;
        
        document.getElementById("taskCountText").innerText = `${completedReminders}/${totalTasks} Completed`; 
        document.getElementById("percentageText").innerText = `${percentage}%`; 
        document.getElementById("progressFill").style.width = `${percentage}%`;
        
        const habitCompleted = parseInt(localStorage.getItem("habitXP_tasks") || "0"); 
        const totalCompletedForXP = completedReminders + habitCompleted;
        const totalXP = totalCompletedForXP * 10;
        const newLevel = Math.floor(totalCompletedForXP / 5) + 1; 
        const xpInCurrentLevel = totalXP % 50;
        
        document.getElementById("gamificationBadge").innerHTML = `⭐ Level ${newLevel} | ✨ ${xpInCurrentLevel}/50 XP`;
        
        if (newLevel > userLevel) { 
            userLevel = newLevel; 
            localStorage.setItem("userLevel", userLevel); 
            fireConfetti(); 
        } else if (newLevel < userLevel) { 
            userLevel = newLevel; 
            localStorage.setItem("userLevel", userLevel); 
        }
    }

    // --- Filtering ---
    function filterByTag(tag) { 
        if(activeTagFilter === tag) { 
            activeTagFilter = ""; 
        } else { 
            activeTagFilter = tag; 
        } 
        loadReminders(); 
    }
    
    function filterByDate(dateStr) { 
        if (selectedDateFilter === dateStr) { 
            selectedDateFilter = null; 
            document.getElementById("tabContainer").style.display = "flex"; 
        } else { 
            selectedDateFilter = dateStr; 
            document.getElementById("tabContainer").style.display = "none"; 
        } 
        loadReminders(); 
    }

    function changeTab(tabName) { 
        currentTab = tabName; 
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); 
        document.getElementById(`tab-${tabName}`).classList.add('active'); 
        searchReminders(); 
    }
    
    function searchReminders() { 
        loadReminders(document.getElementById("searchInput") ? document.getElementById("searchInput").value.toLowerCase() : ""); 
    }

    // --- Habits Core ---
    function addHabit() { 
        const name = document.getElementById("habitInput").value.trim(); 
        if(!name) return showToast("Enter name.", "error");
        
        const habits = JSON.parse(localStorage.getItem("habits"))||[];
        habits.push({ id: Date.now(), name: name, streak: 0, maxStreak: 0, lastCheckIn: null, history: [] }); 
        localStorage.setItem("habits", JSON.stringify(habits));
        
        document.getElementById("habitInput").value = "";
        showToast("Habit added!", "success"); 
        loadHabits(); 
        syncToCloud(); 
    }
    
    function checkInHabit(id) {
        let habits = JSON.parse(localStorage.getItem("habits")) || []; 
        const todayStr = getTodayStr(); 
        const yesterdayStr = getYesterdayStr(); 
        let checkedIn = false;
        
        habits = habits.map(habit => {
            if (habit.id === id) {
                if (habit.lastCheckIn === todayStr) return habit;
                if (habit.lastCheckIn === yesterdayStr) { 
                    habit.streak += 1; 
                } else { 
                    habit.streak = 1; 
                }
                if (habit.streak > habit.maxStreak) habit.maxStreak = habit.streak;
                
                habit.lastCheckIn = todayStr; 
                checkedIn = true; 
                if(!habit.history) habit.history = []; 
                if(!habit.history.includes(todayStr)) habit.history.push(todayStr);
                
                showToast(`🔥 Streak: ${habit.streak}!`, "success");
            } 
            return habit;
        });
        
        if(checkedIn) { 
            localStorage.setItem("habits", JSON.stringify(habits)); 
            loadHabits(); 
            let completed = parseInt(localStorage.getItem("habitXP_tasks") || "0"); 
            localStorage.setItem("habitXP_tasks", completed + 1); 
            updateAnalyticsAndGamification(); 
            syncToCloud(); 
        }
    }

    function deleteHabit(id) { 
        let habits = JSON.parse(localStorage.getItem("habits"))||[]; 
        localStorage.setItem("habits", JSON.stringify(habits.filter(h => h.id !== id))); 
        showToast("Deleted.", "error"); 
        loadHabits(); 
        syncToCloud(); 
    }

    function loadHabits() {
        const habitList = document.getElementById("habitList");
        habitList.innerHTML = ""; 
        const habits = JSON.parse(localStorage.getItem("habits"))||[]; 
        const todayStr = getTodayStr();
        
        habits.forEach(habit => {
            const isCheckedInToday = habit.lastCheckIn === todayStr; 
            const li = document.createElement("li"); 
            li.className = "habit-item";
            li.style.background = "#fff"; 
            li.style.padding = "15px"; 
            li.style.borderRadius = "16px"; 
            li.style.marginBottom = "10px"; 
            li.style.border = "1px solid #f2f2f7";
            
            li.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div>
                    <h4 style="margin:0 0 5px 0; font-size:15px; color:#1c1c1e;">${habit.name}</h4>
                    <span style="background:#e5f1ff; color:#007aff; font-size:11px; padding:4px 8px; border-radius:8px; font-weight:700;">🔥 ${habit.streak}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button style="background:${isCheckedInToday?'#e5e5ea':'#34c759'}; color:${isCheckedInToday?'#8e8e93':'#fff'}; border:none; border-radius:10px; padding:8px 12px; font-weight:700; font-size:12px; cursor:pointer;" onclick="checkInHabit(${habit.id})" ${isCheckedInToday?"disabled":""}>${isCheckedInToday ? "Done ✅" : "Check-in"}</button>
                    <button style="background:#e5f1ff; color:var(--primary); border:none; border-radius:10px; padding:8px 10px; cursor:pointer;" onclick="openHabitDetail(${habit.id})" title="Habit Details">📊</button>
                    <button style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:10px; padding:8px 12px; cursor:pointer;" onclick="deleteHabit(${habit.id})">🗑️</button>
                </div>
            </div>`;
            habitList.appendChild(li);
        }); 
        updateMiniDashboard();
    }

    // --- Reminders Core ---
    function addOrUpdateReminder() {
        const task = document.getElementById("taskInput").value.trim();
        const notes = document.getElementById("notesInput").innerHTML; 
        const time = document.getElementById("timeInput").value; 
        const repeat = document.getElementById("repeatInput").value; 
        const priority = document.getElementById("priorityInput").value; 
        const image = currentImageBase64;
        const audio = voiceMemoBase64; 
        const tags = document.getElementById("tagsInput").value.trim(); 
        const subtasks = getSubtasksFromForm(); 
        const preAlarm = parseInt(document.getElementById("preAlarmInput").value) || 0;
        const assignee = document.getElementById("assigneeInput").value.trim();
        const project = document.getElementById("taskProjectInput").value;
        
                let customRepeat = null;
        if(repeat === 'custom' || repeat === 'hourly') { 
            customRepeat = { interval: document.getElementById("customRepeatInterval").value, type: document.getElementById("customRepeatType").value };
        }

        if (!task || !time) return showToast("Enter title and time.", "error");
        
        const aiCategory = (() => {
            const override = document.getElementById("categoryOverrideInput").value;
            if (override) { try { return JSON.parse(override); } catch(e) {} }
            return autoCategorizeTask(task);
        })();
        let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        
        if (editId) {
            const index = reminders.findIndex(r => r.id === editId);
            if (index !== -1) { 
                reminders[index].task = task;
                reminders[index].notes = notes; 
                reminders[index].time = time; 
                reminders[index].repeat = repeat; 
                reminders[index].priority = priority; 
                reminders[index].image = image; 
                reminders[index].audio = audio;
                reminders[index].isDoc = isDoc; 
                reminders[index].category = aiCategory; 
                reminders[index].tags = tags; 
                reminders[index].subtasks = subtasks; 
                reminders[index].customRepeat = customRepeat; 
                reminders[index].notified = false;
                reminders[index].preAlarm = preAlarm; 
                reminders[index].assignee = assignee;
                reminders[index].project = project;
            } 
            editId = null; 
            showToast("Updated!", "success");
        } else {
            reminders.push({ 
                id: Date.now(), 
                task, 
                notes, 
                image, 
                audio, 
                isDoc, 
                pinned: false, 
                time, 
                repeat, 
                customRepeat, 
                priority, 
                tags, 
                subtasks, 
                category: aiCategory, 
                status: "pending", 
                notified: false, 
                preAlarm: preAlarm, 
                assignee: assignee,
                project
            });
            showToast(`Saved!`, "success");
        }
        
        localStorage.setItem("reminders", JSON.stringify(reminders)); 
        localStorage.removeItem("taskDraft"); 
        loadReminders(); 
        syncToCloud();
        switchPage('home'); // Bug Fix 4: Navigate to home after save
    }

    function editReminder(id) {
        const reminder = (JSON.parse(localStorage.getItem("reminders")) || []).find(r => r.id === id);
        if (reminder) {
            document.getElementById("taskInput").value = reminder.task;
            document.getElementById("notesInput").innerHTML = reminder.notes || ""; 
            document.getElementById("timeInput").value = reminder.time; 
            document.getElementById("repeatInput").value = reminder.repeat || "none"; 
            document.getElementById("priorityInput").value = reminder.priority || "medium";
            document.getElementById("tagsInput").value = reminder.tags || ""; 
            document.getElementById("preAlarmInput").value = reminder.preAlarm || "0"; 
            document.getElementById("assigneeInput").value = reminder.assignee || "";
            document.getElementById("taskProjectInput").value = reminder.project || "";
            document.getElementById("categoryOverrideInput").value = reminder.category ? JSON.stringify(reminder.category) : "";
            updateCategoryPreview();
            
            document.getElementById("subtasksContainer").innerHTML = "";
            if(reminder.subtasks) reminder.subtasks.forEach(sub => addSubtaskField(sub.text, sub.done));
            
                       if((reminder.repeat === 'custom' || reminder.repeat === 'hourly') && reminder.customRepeat) { 
                document.getElementById("customRepeatUI").style.display = "block"; 
                document.getElementById("customRepeatInterval").value = reminder.customRepeat.interval; 
                document.getElementById("customRepeatType").value = reminder.customRepeat.type; 
            } else { 
                document.getElementById("customRepeatUI").style.display = "none"; 
            }
 
            if(reminder.image) { 
                currentImageBase64 = reminder.image;
                isDoc = reminder.isDoc; 
                document.getElementById("imagePreviewContainer").style.display = "block";
                if(isDoc) { 
                    document.getElementById("imagePreview").style.display = "none"; 
                    document.getElementById("docPreview").style.display = "block"; 
                } else { 
                    document.getElementById("imagePreview").src = currentImageBase64; 
                    document.getElementById("imagePreview").style.display = "block"; 
                    document.getElementById("docPreview").style.display = "none"; 
                }
            } else { 
                removeImage(); 
            }
            
            if(reminder.audio) { 
                voiceMemoBase64 = reminder.audio; 
                document.getElementById("voiceMemoAudio").src = voiceMemoBase64; 
                document.getElementById("voiceMemoPreviewContainer").style.display = "flex"; 
            } else { 
                removeVoiceMemo(); 
            }
            
            editId = id;
            document.getElementById("modalTitle").innerText = "Edit Task"; 
            document.getElementById("submitBtn").innerText = "Update Task"; 
            switchPage('add'); 
        }
    }

    function togglePin(id) { 
        let reminders = JSON.parse(localStorage.getItem("reminders")) || []; 
        reminders = reminders.map(r => { 
            if(r.id === id) r.pinned = !r.pinned; 
            return r; 
        }); 
        localStorage.setItem("reminders", JSON.stringify(reminders)); 
        loadReminders(); 
        syncToCloud(); 
    }
        function initSortable() {
        const el = document.getElementById('reminderList');
        if(window.sortableInst) window.sortableInst.destroy();
        window.sortableInst = new Sortable(el, { 
            handle: '.drag-handle', 
            animation: 200, 
            delay: 150,               // <--- નવું ઉમેર્યું (મોબાઈલ માટે)
            delayOnTouchOnly: true,   // <--- નવું ઉમેર્યું (ટચ/સ્ક્રોલ બ્લોક ના થાય)
            onEnd: function () {
                const sortType = document.getElementById("sortInput").value;
                if(sortType !== "manual") { 
                    showToast("Switch to 'Custom Order' to save!", "error"); 
                    loadReminders(); 
                    return; 
                }
                const listItems = document.querySelectorAll('#reminderList .reminder-item'); 
                let newOrderIds = []; 
                listItems.forEach(li => newOrderIds.push(Number(li.getAttribute('data-id'))));
                
                let oldRems = JSON.parse(localStorage.getItem("reminders")) || []; 
                let sortedRems = []; 
                newOrderIds.forEach(id => { 
                    const r = oldRems.find(x => x.id === id); 
                    if(r) sortedRems.push(r); 
                });
                const filteredOut = oldRems.filter(x => !newOrderIds.includes(x.id)); 
                sortedRems = sortedRems.concat(filteredOut); 
                localStorage.setItem("reminders", JSON.stringify(sortedRems)); 
                syncToCloud();
            }
        });
    }

    function loadReminders(filterText = "") {
        const reminderList = document.getElementById("reminderList");
        reminderList.innerHTML = "";
        let reminders = JSON.parse(localStorage.getItem("reminders")) || []; 
        updateAnalyticsAndGamification(); 
        updateMiniDashboard();

        // Tag Filters Rendering
        let allTags = new Set();
        reminders.forEach(r => { 
            if(r.tags) { 
                r.tags.split(',').forEach(t => { 
                    if(t.trim()) allTags.add(t.trim()); 
                }); 
            }
        });
        
        let tagsHtml = `<button class="template-chip ${activeTagFilter===''?'active':''}" onclick="filterByTag('')">All Tags</button>`;
        allTags.forEach(t => { 
            tagsHtml += `<button class="template-chip ${activeTagFilter===t?'active':''}" onclick="filterByTag('${t}')">${t}</button>`; 
        });
        document.getElementById("tagFilterContainer").innerHTML = tagsHtml;
        renderProjectFilter();
        
               // Date & Tab Filtering
        if (currentTab === 'archive') {
            reminders = reminders.filter(r => r.archived === true);
        } else {
        reminders = reminders.filter(r => !r.archived);
        if (selectedDateFilter) { 
            reminders = reminders.filter(r => r.time.split('T')[0] === selectedDateFilter); 
        } else {
            const tomorrow = new Date(); 
            tomorrow.setHours(0,0,0,0); 
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            reminders = reminders.filter(r => {
                const rDate = new Date(r.time);
                if (currentTab === 'done') return r.status === 'completed'; 
                if (currentTab === 'all') return true; 
                if (r.status === 'completed') return false;
                if (currentTab === 'today') return rDate < tomorrow; 
                if (currentTab === 'upcoming') {
                    // ફક્ત તે જ મહિનાના ઇવેન્ટ્સ બતાવો જે કેલેન્ડરમાં સિલેક્ટ કરેલો હોય
                    return rDate.getMonth() === currentCalMonth && rDate.getFullYear() === currentCalYear;
                }
                return true;
            });
        }
        }

        // Text & Active Tag Filtering
        if (filterText) {
            reminders = reminders.filter(r => 
                r.task.toLowerCase().includes(filterText) || 
                (r.notes && r.notes.toLowerCase().includes(filterText)) || 
                (r.tags && r.tags.toLowerCase().includes(filterText))
            );
        }
              if (activeTagFilter) {
            reminders = reminders.filter(r => r.tags && r.tags.includes(activeTagFilter));
        }
        if (activeProjectFilter !== '') {
            reminders = reminders.filter(r => String(r.project || '') === String(activeProjectFilter));
        }
        
        // ટાસ્ક 0 હોય તો પણ કેલેન્ડર હંમેશાં રેન્ડર થવું જ જોઈએ!
        renderHomeCalendar();
        
        clearInterval(timerInterval);
        if (reminders.length === 0) { 
            reminderList.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#8e8e93;">No tasks found</div>`; 
            return; 
        }

        // Sorting
        const sortType = document.getElementById("sortInput").value;
        if(sortType !== "manual") {
            reminders.sort((a, b) => {
                if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
                const pMap = { "high": 3, "medium": 2, "low": 1 };
                if (sortType === "priority-high") return pMap[b.priority||"medium"] - pMap[a.priority||"medium"] || new Date(a.time) - new Date(b.time);
                if (sortType === "priority-low") return pMap[a.priority||"medium"] - pMap[b.priority||"medium"] || new Date(a.time) - new Date(b.time);
                return new Date(a.time) - new Date(b.time); 
            });
        }

        // Rendering List Items
        reminders.forEach(reminder => {
            const li = document.createElement("li"); 
            const isCompleted = reminder.status === "completed"; 
            const priorityClass = reminder.priority ? `priority-${reminder.priority}` : 'priority-medium';
            li.className = `reminder-item ${priorityClass}`;
            if(isCompleted) { 
                li.style.opacity = "0.6"; 
                li.style.borderLeftColor = "#8e8e93"; 
            }
            li.id = `rem_card_${reminder.id}`; 
            li.setAttribute('data-id', reminder.id);
            
            const formattedTime = new Date(reminder.time).toLocaleString("en-IN", { 
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
            });

            let pinnedBadge = reminder.pinned ? `<div style="position:absolute; top:-10px; right:-10px; font-size:16px;">⭐</div>` : ``;
            let catHTML = reminder.category ? `<div style="background:#e5f1ff; color:#007aff; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; margin-bottom:5px; display:inline-block;">${reminder.category.icon} ${reminder.category.name}</div>` : '';
            
            let projHTML = '';
            if (reminder.project) {
                const allProjects = JSON.parse(localStorage.getItem('projects')) || [];
                const proj = allProjects.find(p => String(p.id) === String(reminder.project));
                if (proj) projHTML = `<div class="project-badge-tag" style="background:${proj.color}22; color:${proj.color};">${proj.emoji} ${proj.name}</div>`;
            }
            
                        let repeatText = '';
            if((reminder.repeat === 'custom' || reminder.repeat === 'hourly') && reminder.customRepeat) {
                repeatText = `Every ${reminder.customRepeat.interval} ${reminder.customRepeat.type}`;
            } else if (reminder.repeat && reminder.repeat !== 'none') {
                repeatText = reminder.repeat.charAt(0).toUpperCase() + reminder.repeat.slice(1);
            }
            let repeatHTML = (reminder.repeat && reminder.repeat !== 'none') ? `<div style="background:#fff0f0; color:#ff3b30; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; margin-bottom:5px; display:inline-block; margin-left:5px;">🔁 ${repeatText}</div>` : '';

            let tagsHTML = "";
            if(reminder.tags) { 
                reminder.tags.split(',').forEach(tag => { 
                    if(tag.trim()) tagsHTML += `<span style="background:#e5e5ea; color:#8e8e93; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; margin-bottom:5px; display:inline-block; margin-left:5px;">${tag.trim()}</span> `; 
                }); 
            }
            
            let subHTML = "";
            if(reminder.subtasks && reminder.subtasks.length > 0) {
                let doneCount = reminder.subtasks.filter(s=>s.done).length;
                let totalCount = reminder.subtasks.length; 
                let pct = (doneCount/totalCount)*100;
                subHTML = `<div style="width:100%; height:6px; background:#e5e5ea; border-radius:6px; margin:8px 0; overflow:hidden;"><div style="height:100%; width:${pct}%; background:#34c759;"></div></div><ul style="list-style:none; padding:0; margin:0;">`;
                reminder.subtasks.forEach((sub, idx) => { 
                    subHTML += `<li style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:4px; color:#666;"><input type="checkbox" style="width:16px;height:16px;margin:0;" ${sub.done?'checked':''} onchange="toggleSubtaskLocal(${reminder.id}, ${idx}, this)" ${isCompleted?'disabled':''}> <span style="${sub.done?'text-decoration:line-through;opacity:0.6;':''} font-weight:500;">${sub.text}</span></li>`; 
                });
                subHTML += `</ul>`;
            }

            let notesHTML = reminder.notes ? `<div style="margin: 8px 0; font-size: 13px; color: #666; background: #f2f2f7; padding: 10px; border-radius: 10px;">${reminder.notes}</div>` : "";
            
            let actionBtns;
            if (reminder.archived) {
                actionBtns = `<div style="display:flex; gap:8px; width:100%;">
                    <button style="flex:1; background:#5e5ce6; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="unarchiveTask(${reminder.id})">📤 Unarchive</button>
                    <button style="flex:1; background:#ff3b30; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="deleteReminder(${reminder.id})">🗑️ Delete</button>
                   </div>`;
            } else if (isCompleted) {
                actionBtns = `<div style="display:flex; gap:8px; width:100%;">
                    <button style="flex:1; background:#ff9500; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="toggleStatus(${reminder.id})">Undo</button>
                    <button style="flex:none; background:#5e5ce6; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="archiveTask(${reminder.id})" title="Archive">📦</button>
                    <button style="flex:1; background:#ff3b30; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="deleteReminder(${reminder.id})">🗑️</button>
                   </div>`;
            } else {
                actionBtns = `<div style="display:flex; gap:8px; width:100%; flex-wrap:wrap;">
                    <button style="flex:1; background:#34c759; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="toggleStatus(${reminder.id})">Done</button>
                    <button style="flex:1; background:#007aff; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="editReminder(${reminder.id})">Edit</button>
                    <button style="flex:none; background:#ffcc00; color:black; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="togglePin(${reminder.id})">${reminder.pinned ? 'Unpin' : '⭐'}</button>
                    <button style="flex:none; background:#5e5ce6; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="openShareModal(${reminder.id})" title="Share with family">📤</button>
                    <button style="flex:none; background:#ff3b30; color:white; border:none; border-radius:10px; padding:8px; font-weight:600; cursor:pointer;" onclick="deleteReminder(${reminder.id})">🗑️</button>
                   </div>`;
            }
                   
            let completedDetailsHTML = isCompleted ? `<div style="margin-top:8px; display:inline-block; background:#e5f9e9; color:#34c759; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700;">✅ Done</div>` : `<div id="timer-${reminder.id}" style="margin-top:8px; display:inline-block; background:#f2f2f7; color:#1c1c1e; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700;">Loading...</div>`;
            
            const leftControl = bulkMode 
                ? `<input type="checkbox" onchange="toggleBulkSelect(${reminder.id}, this.checked)" ${selectedBulkIds.has(reminder.id) ? 'checked' : ''} style="width:22px; height:22px; margin-right:10px; flex-shrink:0; cursor:pointer;">`
                : `<div class="drag-handle" style="cursor:grab; font-size:20px; color:#aaa; margin-right:10px; padding-top:5px;">☰</div>`;

            li.innerHTML = `
                ${leftControl}
                ${pinnedBadge}
                <div style="flex-grow:1; width:calc(100% - 30px);">
                    <div style="display:flex; flex-wrap:wrap;">${catHTML} ${projHTML} ${repeatHTML} ${tagsHTML}</div>
                    <h4 style="margin:5px 0; font-size:16px; color:#1c1c1e; font-weight:600; ${isCompleted?'text-decoration:line-through;':''}">${reminder.task}</h4>
                    ${notesHTML}
                    ${subHTML}
                    <p style="font-size:12px; margin:5px 0 0 0; font-weight:600; color:#8e8e93;">📅 ${formattedTime}</p>
                    ${completedDetailsHTML}
                </div>
                <div style="width:100%; margin-top:12px; display:flex; flex-direction:column; gap:8px; ${bulkMode ? 'display:none;' : ''}">${actionBtns}</div>
            `;
                     reminderList.appendChild(li);
        });
        
        updateTimers(); 
        timerInterval = setInterval(updateTimers, 1000); 
        initSortable();
    }



    function speakAlarm(taskText) { 
        if (!voiceAlarmEnabled) return; 
        if ('speechSynthesis' in window) { 
            const synth = window.speechSynthesis; 
            const utterThis = new SpeechSynthesisUtterance("Reminder! It is time to " + taskText); 
            synth.speak(utterThis); 
        } 
    }
      function updateTimers() {
        let reminders = JSON.parse(localStorage.getItem("reminders")) || []; 
        const now = new Date().getTime(); 
        let remsToSave = false;
        
        reminders.forEach(reminder => {
            if (reminder.status !== "completed") {
                const timerElement = document.getElementById(`timer-${reminder.id}`);
                if (timerElement) {
                    const distance = new Date(reminder.time).getTime() - now;
                    const preAlarmMillis = (reminder.preAlarm || 0) * 60000;
                    
                    if (distance <= preAlarmMillis) {
                        timerElement.innerHTML = `⏳ Time's up!
                            <span style="display:inline-flex; gap:4px; margin-left:6px;">
                                <button onclick="snoozeTask(${reminder.id},5)" style="background:#fff; color:#ff3b30; border:1px solid #ff3b30; border-radius:6px; padding:2px 6px; font-size:10px; font-weight:700; cursor:pointer;">+5m</button>
                                <button onclick="snoozeTask(${reminder.id},10)" style="background:#fff; color:#ff3b30; border:1px solid #ff3b30; border-radius:6px; padding:2px 6px; font-size:10px; font-weight:700; cursor:pointer;">+10m</button>
                                <button onclick="snoozeTask(${reminder.id},30)" style="background:#fff; color:#ff3b30; border:1px solid #ff3b30; border-radius:6px; padding:2px 6px; font-size:10px; font-weight:700; cursor:pointer;">+30m</button>
                            </span>`;
                        timerElement.style.background = "#ffe5e5"; 
                        timerElement.style.color = "#ff3b30";
                        if (!reminder.notified) { 
                            playAlarm(); 
                            speakAlarm(reminder.task); 
                            showPushNotification(reminder.task, (reminder.notes||'').replace(/<[^>]*>/g,'') || 'Time to complete this task!');
                            sendWebhookNotification(reminder);
                            reminder.notified = true; 
                            remsToSave = true; 
                        }
                    } else {
                        const d = Math.floor(distance / 86400000), 
                              h = Math.floor((distance % 86400000) / 3600000), 
                              m = Math.floor((distance % 3600000) / 60000), 
                              s = Math.floor((distance % 60000) / 1000);
                        timerElement.innerHTML = `⏱️ Left: ${d>0?d+'d ':''}${h>0||d>0?h+'h ':''}${m}m ${s}s`;
                    }
                }
            }
        });
        
        // લૂપની બહાર સેવ કરવાનું છે જેથી એપ ચોંટી ના જાય!
        if (remsToSave) { 
            localStorage.setItem("reminders", JSON.stringify(reminders)); 
            loadReminders(); 
        }
    }

    function generateNextRepeatTask(oldTask) {
        let newTime = new Date(oldTask.time);
        
        if ((oldTask.repeat === 'custom' || oldTask.repeat === 'hourly') && oldTask.customRepeat) {
            const val = parseInt(oldTask.customRepeat.interval);
            if(oldTask.customRepeat.type === 'hours') newTime.setHours(newTime.getHours() + val);
            if(oldTask.customRepeat.type === 'days') newTime.setDate(newTime.getDate() + val);
            if(oldTask.customRepeat.type === 'weeks') newTime.setDate(newTime.getDate() + (val*7));
            if(oldTask.customRepeat.type === 'months') newTime.setMonth(newTime.getMonth() + val);
        } else {
            if (oldTask.repeat === 'daily') newTime.setDate(newTime.getDate() + 1);
            if (oldTask.repeat === 'weekly') newTime.setDate(newTime.getDate() + 7);
            if (oldTask.repeat === 'monthly') newTime.setMonth(newTime.getMonth() + 1);
            if (oldTask.repeat === 'yearly') newTime.setFullYear(newTime.getFullYear() + 1);
        }
        
        const tzoffset = newTime.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(newTime - tzoffset)).toISOString().slice(0, 16);
        
        let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        reminders.push({ 
            id: Date.now(), 
            task: oldTask.task, 
            notes: oldTask.notes, 
            image: oldTask.image, 
            audio: oldTask.audio, 
            isDoc: oldTask.isDoc, 
            time: localISOTime, 
            repeat: oldTask.repeat, 
            customRepeat: oldTask.customRepeat, 
            priority: oldTask.priority, 
            category: oldTask.category, 
            tags: oldTask.tags, 
            subtasks: oldTask.subtasks, 
            pinned: false, 
            status: "pending", 
            notified: false, 
            preAlarm: oldTask.preAlarm || 0, 
            assignee: oldTask.assignee || "" 
        });
        localStorage.setItem("reminders", JSON.stringify(reminders));
    }

    function fireConfetti() {
        const canvas = document.getElementById('confettiCanvas');
        const ctx = canvas.getContext('2d'); 
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight; 
        let particles = [];
        
        for(let i=0; i<100; i++) { 
            particles.push({ 
                x: canvas.width/2, 
                y: canvas.height/2, 
                vx: (Math.random()-0.5)*20, 
                vy: (Math.random()-0.5)*20 - 5, 
                color: `hsl(${Math.random()*360}, 100%, 50%)`, 
                size: Math.random()*8+2 
            });
        }
        
        function animate() { 
            ctx.clearRect(0,0, canvas.width, canvas.height);
            particles.forEach((p, i) => { 
                p.x += p.vx; 
                p.y += p.vy; 
                p.vy += 0.5; 
                ctx.fillStyle = p.color; 
                ctx.beginPath(); 
                ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); 
                ctx.fill(); 
                if(p.y > canvas.height) particles.splice(i, 1); 
            });
            if(particles.length > 0) {
                requestAnimationFrame(animate); 
            } else {
                ctx.clearRect(0,0, canvas.width, canvas.height); 
            }
        } 
        animate();
    }

    function toggleStatus(id) {
        let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        let taskToRepeat = null;
        
        reminders = reminders.map(r => {
            if (r.id === id) { 
                if (r.status === "pending") { 
                    r.status = "completed"; 
                    r.completedBy = userName || "User"; 
                    r.completedAt = new Date().toISOString(); 
                    showToast("Done!", "success"); 
                    fireConfetti(); 
                    if (r.repeat && r.repeat !== "none") taskToRepeat = r; 
                } else { 
                    r.status = "pending"; 
                    r.notified = false; 
                    delete r.completedBy; 
                    delete r.completedAt; 
                    showToast("Restored.", "info"); 
                } 
            } 
            return r;
        });
        
        localStorage.setItem("reminders", JSON.stringify(reminders)); 
        if (taskToRepeat) generateNextRepeatTask(taskToRepeat); 
        searchReminders(); 
        syncToCloud(); 
    }

    function playAlarm() { 
        new Audio(userAlarmSound).play().catch(e => console.log(e));
        if (navigator.vibrate) { navigator.vibrate([1000, 500, 1000, 500, 1000]); } 
    }
    
    function deleteReminder(id) { 
        let r = JSON.parse(localStorage.getItem("reminders"))||[];
        deletedTaskTemp = r.find(x => x.id === id); 
        localStorage.setItem("reminders", JSON.stringify(r.filter(x => x.id !== id))); 
        searchReminders(); 
        syncToCloud(); 
        
        const container = document.getElementById("toastContainer");
        const toast = document.createElement("div"); 
        toast.className = `toast error`; 
        toast.innerHTML = `<span>🗑️ Deleted</span> <button onclick="undoDelete()" style="background:white; color:black; border:none; padding:4px 8px; border-radius:8px; cursor:pointer; font-weight:700; margin-left:10px;">UNDO</button>`;
        container.appendChild(toast); 
        
        clearTimeout(deleteTimeout); 
        deleteTimeout = setTimeout(() => { 
            if(toast) toast.remove(); 
            deletedTaskTemp = null; 
        }, 5000);
    }
    
    function undoDelete() {
        if(deletedTaskTemp) { 
            let r = JSON.parse(localStorage.getItem("reminders"))||[];
            r.push(deletedTaskTemp); 
            localStorage.setItem("reminders", JSON.stringify(r)); 
            deletedTaskTemp = null; 
            document.querySelectorAll('.toast.error').forEach(t => t.remove()); 
            showToast("Restored! ♻️", "success"); 
            searchReminders(); 
            syncToCloud();
        }
    }

    // --- Export / Import ---
    function shareAppURL() { 
        const data = encodeURIComponent(btoa(JSON.stringify({ t: "Master App", n: "Sync life." })));
        const url = window.location.origin + window.location.pathname + "?share=" + data; 
        navigator.clipboard.writeText(url).then(() => showToast("Link Copied!", "success"));
    }

    function exportToCSV() {
        const reminders = JSON.parse(localStorage.getItem("reminders")) || []; 
        if(reminders.length === 0) return showToast("No data", "error");
        
        let csvContent = "data:text/csv;charset=utf-8,Title,Notes,Date & Time,Priority,Status,Category,Repeat\n";
        reminders.forEach(r => { 
            const title = `"${(r.task || "").replace(/"/g, '""')}"`; 
            const notes = `"${((r.notes||"").replace(/(<([^>]+)>)/gi, "")).replace(/\"/g, '""')}"`; 
            csvContent += `${title},${notes},${r.time},${r.priority || "medium"},${r.status},${r.category ? r.category.name : "Task"},${r.repeat || "none"}\n`; 
        });
        
        const link = document.createElement("a"); 
        link.setAttribute("href", encodeURI(csvContent)); 
        link.setAttribute("download", "My_Tasks.csv"); 
        document.body.appendChild(link); 
        link.click(); 
        link.remove(); 
        showToast("Exported!", "success");
    }

    function importDataFile(event) {
        const file = event.target.files[0];
        if (!file) return; 
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try { 
                const data = JSON.parse(e.target.result);
                if(data.reminders) { 
                    localStorage.setItem("reminders", JSON.stringify(data.reminders)); 
                    if(data.habits) localStorage.setItem("habits", JSON.stringify(data.habits)); 
                    showToast("Restored! Refreshing...", "success"); 
                    syncToCloud(); 
                    setTimeout(()=> location.reload(), 1500); 
                } else { 
                    showToast("Invalid JSON", "error");
                } 
            } catch (err) { 
                showToast("JSON only", "error"); 
            }
        }; 
        reader.readAsText(file);
    }

    // --- Eisenhower Matrix ---
    function openMatrixModal() {
        const rems = JSON.parse(localStorage.getItem("reminders")) || [];
        const pending = rems.filter(r => r.status === 'pending'); 
        const today = getTodayStr(); 
        let q1="", q2="", q3="", q4="";
        
        pending.forEach(r => {
            const isUrgent = r.time.split('T')[0] <= today; 
            const isImportant = r.priority === 'high';
            const taskHtml = `<div style="font-size:12px; background:white; padding:8px; border-radius:8px; margin-bottom:6px; cursor:pointer;" onclick="editReminder(${r.id}); closeModal('matrixModal')">👉 ${r.task}</div>`;
            
            if(isUrgent && isImportant) q1 += taskHtml; 
            else if(!isUrgent && isImportant) q2 += taskHtml; 
            else if(isUrgent && !isImportant) q3 += taskHtml; 
            else q4 += taskHtml;
        });
        
        document.getElementById("q1Tasks").innerHTML = q1 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>"; 
        document.getElementById("q2Tasks").innerHTML = q2 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>"; 
        document.getElementById("q3Tasks").innerHTML = q3 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>"; 
        document.getElementById("q4Tasks").innerHTML = q4 || "<p style='font-size:11px; text-align:center; color:#8e8e93;'>Clear!</p>";
        openModal('matrixModal');
    }

    // ============================================================
    // FEATURE 1: PUSH NOTIFICATIONS
    // ============================================================
    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            return showToast('Browser does not support notifications', 'error');
        }
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
                localStorage.setItem('pushNotif', 'true');
                document.getElementById('notifBtn').innerText = '✅ On';
                document.getElementById('notifBtn').style.background = '#34c759';
                new Notification('⏰ Master App', { body: 'Notifications are now active! ✅' });
                showToast('🔔 Push Notifications Enabled!', 'success');
            } else {
                localStorage.setItem('pushNotif', 'false');
                showToast('Notification permission denied', 'error');
            }
        });
    }

    function showPushNotification(title, body) {
        if (Notification.permission === 'granted' && localStorage.getItem('pushNotif') === 'true') {
            const n = new Notification('⏰ ' + title, {
                body: body || 'Time to complete this task!',
                requireInteraction: true,
                tag: 'reminder-' + title
            });
            n.onclick = function() { window.focus(); n.close(); };
            // Persistent: stays until user dismisses/clicks (no auto-close)
        }
    }

    // Init notification button state on load
    document.addEventListener('DOMContentLoaded', () => {
        if (localStorage.getItem('pushNotif') === 'true' && Notification.permission === 'granted') {
            const btn = document.getElementById('notifBtn');
            if (btn) { btn.innerText = '✅ On'; btn.style.background = '#34c759'; }
        }
    });

    // ============================================================
    // FEATURE 2: PROJECTS / FOLDERS
    // ============================================================
    let activeProjectFilter = '';

    function openProjectsModal() {
        renderProjectsList();
        openModal('projectsModal');
    }

    function addProject() {
        const nameEl = document.getElementById('newProjectName');
        const name = nameEl.value.trim();
        if (!name) return showToast('Enter project name!', 'error');
        const emojiEl = document.getElementById('newProjectEmoji');
        const colorEl = document.getElementById('newProjectColor');
        const projects = JSON.parse(localStorage.getItem('projects')) || [];
        projects.push({
            id: Date.now(),
            name,
            color: colorEl.value || '#007aff',
            emoji: emojiEl.value || '📁',
            milestones: []
        });
        localStorage.setItem('projects', JSON.stringify(projects));
        nameEl.value = ''; emojiEl.value = '';
        renderProjectsList();
        renderProjectFilter();
        renderProjectDropdown();
        syncToCloud();
        showToast('Project added! 📁', 'success');
    }

    function deleteProject(id) {
        let projects = JSON.parse(localStorage.getItem('projects')) || [];
        projects = projects.filter(p => p.id !== id);
        localStorage.setItem('projects', JSON.stringify(projects));
        renderProjectsList();
        renderProjectFilter();
        renderProjectDropdown();
        syncToCloud();
        showToast('Project deleted.', 'error');
    }

    function renderProjectsList() {
        const container = document.getElementById('projectsListContainer');
        if (!container) return;
        const projects = JSON.parse(localStorage.getItem('projects')) || [];
        if (projects.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:15px;">No projects yet. Add one above!</p>';
            return;
        }
        const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        container.innerHTML = projects.map(p => {
            const tasks = reminders.filter(r => String(r.project) === String(p.id) && !r.archived);
            const completed = tasks.filter(r => r.status === 'completed').length;
            const pct = tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0;
            return `
            <div style="background:#f2f2f7; padding:12px 14px; border-radius:12px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;" onclick="openProjectDetail(${p.id})">
                        <div style="width:10px; height:10px; border-radius:50%; background:${p.color}; flex-shrink:0;"></div>
                        <span style="font-size:18px;">${p.emoji}</span>
                        <span style="font-weight:600; font-size:14px;">${p.name}</span>
                    </div>
                    <button onclick="deleteProject(${p.id})" style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:8px; padding:6px 10px; cursor:pointer; font-size:13px;">🗑️</button>
                </div>
                <div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%; background:${p.color};"></div></div>
                <p style="margin:5px 0 0; font-size:11px; color:#8e8e93;">${completed}/${tasks.length} tasks · ${pct}% · tap for details 👆</p>
            </div>
        `;
        }).join('');
    }

    function renderProjectFilter() {
        const container = document.getElementById('projectFilterContainer');
        if (!container) return;
        const projects = JSON.parse(localStorage.getItem('projects')) || [];
        if (projects.length === 0) { container.innerHTML = ''; return; }
        let html = `<button class="template-chip ${activeProjectFilter === '' ? 'active' : ''}" onclick="filterByProject('')">📋 All</button>`;
        projects.forEach(p => {
            const isActive = String(activeProjectFilter) === String(p.id);
            html += `<button class="template-chip ${isActive ? 'active' : ''}" onclick="filterByProject(${p.id})">${p.emoji} ${p.name}</button>`;
        });
        container.innerHTML = html;
    }

    function filterByProject(projectId) {
        activeProjectFilter = projectId;
        renderProjectFilter();
        loadReminders();
    }

    function renderProjectDropdown() {
        const select = document.getElementById('taskProjectInput');
        if (!select) return;
        const projects = JSON.parse(localStorage.getItem('projects')) || [];
        let html = '<option value="">📋 No Project</option>';
        projects.forEach(p => {
            html += `<option value="${p.id}">${p.emoji} ${p.name}</option>`;
        });
        select.innerHTML = html;
    }

    // ============================================================
    // FEATURE 3: MOOD TRACKER
    // ============================================================
    const moodData = [
        { emoji: '😄', label: 'Great', color: '#34c759' },
        { emoji: '😊', label: 'Good',  color: '#30d158' },
        { emoji: '😐', label: 'Okay',  color: '#ff9500' },
        { emoji: '😔', label: 'Sad',   color: '#5e5ce6' },
        { emoji: '😢', label: 'Bad',   color: '#ff3b30' }
    ];

    function logMood(moodIndex) {
        const todayStr = getTodayStr();
        const moodLog = JSON.parse(localStorage.getItem('moodLog')) || {};
        moodLog[todayStr] = moodIndex;
        localStorage.setItem('moodLog', JSON.stringify(moodLog));
        renderMoodTracker();
        syncToCloud();
        showToast(`Mood logged: ${moodData[moodIndex].emoji} ${moodData[moodIndex].label}`, 'success');
    }

    function renderMoodTracker() {
        const container = document.getElementById('moodTrackerCard');
        if (!container) return;
        const todayStr = getTodayStr();
        const moodLog = JSON.parse(localStorage.getItem('moodLog')) || {};
        const todayMood = moodLog[todayStr] !== undefined ? moodLog[todayStr] : -1;
        const last7 = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });
        const historyHtml = last7.map(date => {
            const idx = moodLog[date];
            return `<span style="font-size:20px;" title="${date}">${idx !== undefined ? moodData[idx].emoji : '⬜'}</span>`;
        }).join('');
        const moodBtnsHtml = moodData.map((m, i) => `
            <button onclick="logMood(${i})" class="mood-emoji-btn ${todayMood === i ? 'selected' : ''}"
                    title="${m.label}" style="${todayMood === i ? `border-color:${m.color}; background:${m.color}22;` : ''}">
                ${m.emoji}
            </button>
        `).join('');
        container.innerHTML = `
            <h5 style="margin:0 0 10px 0; color:#8e8e93; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                😊 TODAY'S MOOD ${todayMood >= 0 ? '— ' + moodData[todayMood].label : ''}
            </h5>
            <div class="mood-emojis">${moodBtnsHtml}</div>
            <div style="border-top:1px solid #f2f2f7; margin-top:10px; padding-top:10px;">
                <p style="font-size:11px; color:#8e8e93; margin:0 0 6px 0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Last 7 days</p>
                <div class="mood-history">${historyHtml}</div>
            </div>
        `;
    }

    // ============================================================
    // FEATURE 4: GOOGLE CALENDAR EXPORT (.ICS)
    // ============================================================
    function exportToGoogleCalendar() {
        const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const pending = reminders.filter(r => r.status !== 'completed' && r.time);
        if (pending.length === 0) return showToast('No pending tasks to export!', 'error');
        const fmt = (d) => d.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
        let ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Master Reminder App//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
        pending.forEach(r => {
            const start = new Date(r.time);
            const end   = new Date(start.getTime() + 3600000);
            const desc  = (r.notes || '').replace(/<[^>]*>/g,'').replace(/,/g,'\\,').replace(/\n/g,'\\n');
            const title = (r.task || 'Task').replace(/,/g,'\\,');
            const prio  = r.priority === 'high' ? '1' : r.priority === 'low' ? '9' : '5';
            ics.push('BEGIN:VEVENT',`UID:${r.id}@masterapp`,`DTSTAMP:${fmt(new Date())}`,
                `DTSTART:${fmt(start)}`,`DTEND:${fmt(end)}`,`SUMMARY:${title}`,
                `DESCRIPTION:${desc}`,`PRIORITY:${prio}`,
                `CATEGORIES:${r.category ? r.category.name : 'Task'}`,'END:VEVENT');
        });
        ics.push('END:VCALENDAR');
        const blob = new Blob([ics.join('\r\n')], { type:'text/calendar;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'MasterApp_Tasks.ics';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        showToast(`📅 ${pending.length} tasks exported! Import .ics into Google Calendar.`, 'success');
    }

    // ============================================================
    // FEATURE 5: FAMILY TASK SHARING (Firebase)
    // ============================================================
    let sharedTaskIdToShare = null;

    function openShareModal(taskId) {
        sharedTaskIdToShare = taskId;
        const r = (JSON.parse(localStorage.getItem('reminders')) || []).find(x => x.id === taskId);
        if (r) document.getElementById('shareTaskTitle').innerText = '📤 Share: ' + r.task;
        document.getElementById('shareEmailInput').value = '';
        openModal('shareTaskModal');
    }

    async function shareTaskWithFamily() {
        if (!currentUser) return showToast('Login required!', 'error');
        const email = document.getElementById('shareEmailInput').value.trim().toLowerCase();
        if (!email || !email.includes('@')) return showToast('Enter valid email!', 'error');
        const r = (JSON.parse(localStorage.getItem('reminders')) || []).find(x => x.id === sharedTaskIdToShare);
        if (!r) return;
        showToast('Sharing...', 'info');
        try {
            await db.collection('shared_tasks').add({
                fromUid:   currentUser.uid,
                fromName:  userName || currentUser.email,
                toEmail:   email,
                task:      r.task,
                notes:     r.notes || '',
                time:      r.time,
                priority:  r.priority || 'medium',
                category:  r.category || null,
                sharedAt:  new Date().toISOString(),
                status:    'pending'
            });
            closeModal('shareTaskModal');
            showToast(`✅ Shared with ${email}!`, 'success');
        } catch(e) { showToast('Share error: ' + e.message, 'error'); }
    }

    async function openSharedModal() {
        openModal('sharedWithMeModal');
        loadSharedWithMe();
    }

    async function loadSharedWithMe() {
        if (!currentUser) return;
        const container = document.getElementById('sharedTasksContainer');
        if (!container) return;
        container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">Loading...</p>';
        try {
            const snap = await db.collection('shared_tasks')
                .where('toEmail', '==', currentUser.email.toLowerCase())
                .where('status',  '==', 'pending')
                .get();
            const badge = document.getElementById('sharedBadge');
            if (!snap.empty && badge) { badge.style.display='flex'; badge.innerText = snap.size; }
            else if (badge) { badge.style.display = 'none'; }
            if (snap.empty) {
                container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">No shared tasks 📭</p>';
                return;
            }
            let html = '';
            snap.forEach(doc => {
                const t = doc.data();
                const date = new Date(t.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
                const prioColor = t.priority==='high'?'#ff3b30':t.priority==='low'?'#34c759':'#ff9500';
                html += `
                    <div style="background:#f2f2f7; border-radius:14px; padding:14px; margin-bottom:10px; border-left:4px solid ${prioColor};">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                            <div style="flex:1;">
                                <h4 style="margin:0 0 4px; font-size:15px;">${t.task}</h4>
                                <p style="margin:0; font-size:12px; color:#8e8e93;">📅 ${date}</p>
                                <p style="margin:4px 0 0; font-size:12px; color:var(--primary); font-weight:600;">From: ${t.fromName}</p>
                                ${t.notes ? `<p style="margin:6px 0 0; font-size:12px; color:#666; background:white; padding:8px; border-radius:8px;">${t.notes}</p>` : ''}
                            </div>
                            <button onclick="acceptSharedTask('${doc.id}')" style="background:#34c759; color:white; border:none; border-radius:10px; padding:8px 14px; font-weight:700; font-size:12px; cursor:pointer; white-space:nowrap; flex-shrink:0;">Add ✅</button>
                        </div>
                    </div>`;
            });
            container.innerHTML = html;
        } catch(e) {
            container.innerHTML = '<p style="text-align:center; color:#ff3b30; font-size:13px;">Error loading. Check Firestore rules.</p>';
        }
    }

    async function acceptSharedTask(docId) {
        try {
            const doc = await db.collection('shared_tasks').doc(docId).get();
            if (!doc.exists) return;
            const t = doc.data();
            let reminders = JSON.parse(localStorage.getItem('reminders')) || [];
            reminders.push({
                id: Date.now(), task: t.task, notes: t.notes || '', time: t.time,
                priority: t.priority || 'medium', category: t.category || {name:'Task',icon:'📝'},
                repeat: 'none', status: 'pending', notified: false, pinned: false,
                tags: 'shared', preAlarm: 0, assignee: t.fromName || '', project: ''
            });
            localStorage.setItem('reminders', JSON.stringify(reminders));
            await db.collection('shared_tasks').doc(docId).update({ status: 'accepted' });
            syncToCloud(); loadReminders(); loadSharedWithMe();
            showToast('Task added to your list! ✅', 'success');
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    // ============================================================
    // BATCH 2 — SNOOZE
    // ============================================================
    function snoozeTask(id, minutes) {
        let reminders = JSON.parse(localStorage.getItem("reminders")) || [];
        const idx = reminders.findIndex(r => r.id === id);
        if (idx === -1) return;
        const d = new Date(new Date(reminders[idx].time).getTime() + minutes * 60000);
        const pad = n => String(n).padStart(2, '0');
        reminders[idx].time = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        reminders[idx].notified = false;
        localStorage.setItem("reminders", JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        showToast(`😴 Snoozed ${minutes} min`, "success");
    }

    // ============================================================
    // BATCH 2 — FONT SIZE
    // ============================================================
    function setFontSize(size, sync = true) {
        const zoomMap = { small: '0.9', medium: '1', large: '1.15' };
        const mainAppEl = document.getElementById('mainApp');
        if (mainAppEl) mainAppEl.style.zoom = zoomMap[size] || '1';
        localStorage.setItem('appFontSize', size);
        document.querySelectorAll('.font-size-btn').forEach(b => b.classList.remove('active-font'));
        const btn = document.getElementById('fontBtn-' + size);
        if (btn) btn.classList.add('active-font');
        if (sync) { syncToCloud(); showToast('Font size updated!', 'success'); }
    }

    // ============================================================
    // BATCH 2 — SLEEP TRACKER
    // ============================================================
    function logSleep() {
        const hoursInput = document.getElementById('sleepHoursInput');
        const hours = parseFloat(hoursInput.value);
        if (isNaN(hours) || hours < 0 || hours > 16) return showToast('Enter valid hours (0-16)', 'error');
        const todayStr = getTodayStr();
        const sleepLog = JSON.parse(localStorage.getItem('sleepLog')) || {};
        sleepLog[todayStr] = hours;
        localStorage.setItem('sleepLog', JSON.stringify(sleepLog));
        renderSleepTracker();
        syncToCloud();
        showToast(`😴 Logged ${hours}h sleep`, 'success');
    }

    function renderSleepTracker() {
        const container = document.getElementById('sleepHistoryBars');
        if (!container) return;
        const sleepLog = JSON.parse(localStorage.getItem('sleepLog')) || {};
        const last7 = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });
        const maxH = 10;
        container.innerHTML = last7.map(date => {
            const h = sleepLog[date] || 0;
            const pct = Math.min(100, (h / maxH) * 100);
            const color = h === 0 ? '#e5e5ea' : h < 6 ? '#ff9500' : '#34c759';
            return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;">
                        <div style="width:100%; max-width:18px; height:${Math.max(pct,4)}%; background:${color}; border-radius:4px;" title="${date}: ${h}h"></div>
                    </div>`;
        }).join('');
        const todayStr = getTodayStr();
        const hoursInput = document.getElementById('sleepHoursInput');
        if (hoursInput && sleepLog[todayStr] !== undefined) hoursInput.value = sleepLog[todayStr];
    }

    // ============================================================
    // BATCH 2 — TASK ARCHIVE
    // ============================================================
    function archiveTask(id) {
        let reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const idx = reminders.findIndex(r => r.id === id);
        if (idx === -1) return;
        reminders[idx].archived = true;
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        showToast('Archived 📦', 'success');
    }

    function unarchiveTask(id) {
        let reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const idx = reminders.findIndex(r => r.id === id);
        if (idx === -1) return;
        reminders[idx].archived = false;
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        showToast('Restored from archive 📤', 'success');
    }

    // ============================================================
    // BATCH 2 — BULK SELECT / ACTIONS
    // ============================================================
    let bulkMode = false;
    let selectedBulkIds = new Set();

    function toggleBulkMode() {
        bulkMode = !bulkMode;
        selectedBulkIds.clear();
        const bar = document.getElementById('bulkActionBar');
        const btn = document.getElementById('bulkToggleBtn');
        if (bulkMode) {
            bar.style.display = 'flex';
            btn.style.background = '#34c759';
            btn.style.color = 'white';
            btn.innerText = '☑️ Selecting...';
        } else {
            bar.style.display = 'none';
            btn.style.background = '';
            btn.style.color = '#34c759';
            btn.innerText = '☑️ Select';
        }
        updateBulkCount();
        loadReminders();
    }

    function toggleBulkSelect(id, checked) {
        if (checked) selectedBulkIds.add(id);
        else selectedBulkIds.delete(id);
        updateBulkCount();
    }

    function updateBulkCount() {
        const el = document.getElementById('bulkCountText');
        if (el) el.innerText = `${selectedBulkIds.size} selected`;
    }

    function bulkComplete() {
        if (selectedBulkIds.size === 0) return showToast('Select tasks first!', 'error');
        let reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        reminders.forEach(r => { if (selectedBulkIds.has(r.id)) r.status = 'completed'; });
        localStorage.setItem('reminders', JSON.stringify(reminders));
        showToast(`${selectedBulkIds.size} tasks marked Done ✅`, 'success');
        toggleBulkMode();
        syncToCloud();
    }

    function bulkArchive() {
        if (selectedBulkIds.size === 0) return showToast('Select tasks first!', 'error');
        let reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        reminders.forEach(r => { if (selectedBulkIds.has(r.id)) { r.archived = true; r.status = 'completed'; } });
        localStorage.setItem('reminders', JSON.stringify(reminders));
        showToast(`${selectedBulkIds.size} tasks archived 📦`, 'success');
        toggleBulkMode();
        syncToCloud();
    }

    function bulkDelete() {
        if (selectedBulkIds.size === 0) return showToast('Select tasks first!', 'error');
        if (!confirm(`Delete ${selectedBulkIds.size} tasks? This cannot be undone.`)) return;
        let reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        reminders = reminders.filter(r => !selectedBulkIds.has(r.id));
        localStorage.setItem('reminders', JSON.stringify(reminders));
        showToast(`${selectedBulkIds.size} tasks deleted 🗑️`, 'error');
        toggleBulkMode();
        syncToCloud();
    }

    // ============================================================
    // BATCH 2 — WEBHOOK (WhatsApp/SMS via Zapier/Make/IFTTT)
    // ============================================================
    function sendWebhookNotification(reminder) {
        const url = (localStorage.getItem('webhookUrl') || '').trim();
        if (!url) return;
        const plainNotes = (reminder.notes || '').replace(/<[^>]*>/g, '');
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `⏰ Reminder: ${reminder.task}`,
                task: reminder.task,
                notes: plainNotes,
                time: reminder.time,
                priority: reminder.priority || 'medium'
            })
        }).catch(() => {});
    }

    // ============================================================
    // BATCH 2 — GOOGLE CALENDAR 2-WAY SYNC
    // ============================================================
    let gcalTokenClient = null;
    let gcalAccessToken = null;

    function loadGcalScripts(callback) {
        if (window.google && window.google.accounts) return callback();
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.onload = callback;
        s.onerror = () => showToast('Could not load Google script. Check internet.', 'error');
        document.head.appendChild(s);
    }

    function connectGoogleCalendar() {
        const clientId = document.getElementById('gcalClientIdInput').value.trim();
        if (!clientId) return showToast('Paste Google Client ID first!', 'error');
        localStorage.setItem('gcalClientId', clientId);
        loadGcalScripts(() => {
            gcalTokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                callback: (resp) => {
                    if (resp.error) return showToast('Google auth error: ' + resp.error, 'error');
                    gcalAccessToken = resp.access_token;
                    document.getElementById('gcalStatusText').innerText = '✅ Connected! Tap "Sync Now" to sync.';
                    showToast('Google Calendar Connected! 🎉', 'success');
                    syncToCloud();
                }
            });
            gcalTokenClient.requestAccessToken();
        });
    }

    async function syncFromGoogleCalendar() {
        if (!gcalAccessToken) return showToast('Tap "Connect" first!', 'error');
        document.getElementById('gcalStatusText').innerText = '🔄 Syncing...';
        let reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        let pushCount = 0, pullCount = 0;

        for (let r of reminders) {
            if (!r.gcalEventId && r.status !== 'completed' && !r.archived && r.time) {
                try {
                    const start = new Date(r.time);
                    const end = new Date(start.getTime() + 3600000);
                    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + gcalAccessToken, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            summary: r.task,
                            description: (r.notes||'').replace(/<[^>]*>/g,''),
                            start: { dateTime: start.toISOString() },
                            end: { dateTime: end.toISOString() }
                        })
                    });
                    const data = await res.json();
                    if (data.id) { r.gcalEventId = data.id; pushCount++; }
                } catch(e) {}
            }
        }

        try {
            const timeMin = new Date().toISOString();
            const timeMax = new Date(Date.now() + 30*86400000).toISOString();
            const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, {
                headers: { 'Authorization': 'Bearer ' + gcalAccessToken }
            });
            const data = await res.json();
            const existingIds = new Set(reminders.map(r => r.gcalEventId).filter(Boolean));
            (data.items || []).forEach(ev => {
                if (existingIds.has(ev.id)) return;
                const startTime = ev.start.dateTime || (ev.start.date + 'T09:00');
                reminders.push({
                    id: Date.now() + Math.floor(Math.random()*1000),
                    task: ev.summary || 'Untitled Event',
                    notes: ev.description || '',
                    time: startTime.slice(0,16),
                    priority: 'medium',
                    repeat: 'none', status: 'pending', notified: false, pinned: false,
                    tags: 'gcal', preAlarm: 0, gcalEventId: ev.id, category: {name:'Calendar', icon:'📅'}
                });
                pullCount++;
            });
        } catch(e) {}

        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        syncToCloud();
        document.getElementById('gcalStatusText').innerText = `✅ Synced! ${pushCount} sent, ${pullCount} imported.`;
        showToast(`Calendar Synced: ${pushCount} sent, ${pullCount} new 📅`, 'success');
    }

    function showGcalInstructions() {
        alert(
            "📅 Free Google Calendar Client ID Setup:\n\n" +
            "1. Go to console.cloud.google.com\n" +
            "2. Create a new Project\n" +
            "3. APIs & Services → Enable 'Google Calendar API'\n" +
            "4. OAuth consent screen → External → Add your email as Test User\n" +
            "5. Credentials → Create Credentials → OAuth Client ID → Web application\n" +
            "6. Add this app's URL under 'Authorized JavaScript origins'\n" +
            "7. Copy the Client ID and paste it above!\n\n" +
            "Free forever for personal use 🎉\n" +
            "Note: You'll need to tap 'Connect' once per session (token expires after ~1 hour)."
        );
    }

    // ============================================================
    // BATCH 2 — AI CHAT ASSISTANT / DAILY PLANNER / SMART RESCHEDULE
    // ============================================================
    async function callGeminiAI(prompt) {
        const apiKey = document.getElementById("aiApiKeyInput").value.trim() || localStorage.getItem("geminiKey");
        if (!apiKey) throw new Error("NO_KEY");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text.trim();
    }

    function appendChatBubble(text, sender) {
        const container = document.getElementById('aiChatMessages');
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.innerText = text;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
        return bubble;
    }

    function buildAIContext() {
        const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const habits = JSON.parse(localStorage.getItem('habits')) || [];
        const todayStr = getTodayStr();
        const pending = reminders.filter(r => r.status !== 'completed' && !r.archived);
        const todayTasks = pending.filter(r => r.time.split('T')[0] === todayStr);
        const overdue = pending.filter(r => new Date(r.time) < new Date());
        const moodLog = JSON.parse(localStorage.getItem('moodLog')) || {};
        const sleepLog = JSON.parse(localStorage.getItem('sleepLog')) || {};
        const moodLabels = ['Great 😄','Good 😊','Okay 😐','Sad 😔','Bad 😢'];

        let ctx = `You are a friendly productivity assistant inside "${userName}"'s reminder app. Today is ${todayStr}.\n`;
        ctx += `Today's tasks (${todayTasks.length}): ${todayTasks.map(t=>t.task).join(', ') || 'none'}\n`;
        ctx += `Overdue tasks (${overdue.length}): ${overdue.map(t=>t.task).join(', ') || 'none'}\n`;
        ctx += `Total pending tasks: ${pending.length}\n`;
        ctx += `Habits: ${habits.map(h=>`${h.name} (streak ${h.streak})`).join(', ') || 'none'}\n`;
        if (moodLog[todayStr] !== undefined) ctx += `Today's mood: ${moodLabels[moodLog[todayStr]]}\n`;
        if (sleepLog[todayStr] !== undefined) ctx += `Last night's sleep: ${sleepLog[todayStr]}h\n`;
        return ctx;
    }

    function openAIChat() {
        openModal('aiChatModal');
        setTimeout(() => { const el = document.getElementById('aiChatInput'); if (el) el.focus(); }, 200);
    }

    function aiHandleError(bubble, e) {
        if (e.message === 'NO_KEY') {
            bubble.innerText = "⚠️ Free Gemini API Key joiye. Settings ma jaine paste karo!";
            closeModal('aiChatModal');
            switchPage('settings');
            showToast("Add Gemini API Key in Settings!", "error");
        } else {
            bubble.innerText = "⚠️ Error: " + e.message;
        }
    }

    async function sendAIChatMessage() {
        const input = document.getElementById('aiChatInput');
        const msg = input.value.trim();
        if (!msg) return;
        appendChatBubble(msg, 'user');
        input.value = '';
        const thinking = appendChatBubble('🤔 Thinking...', 'ai');
        try {
            const context = buildAIContext();
            const prompt = `${context}\nUser question: ${msg}\n\nAnswer briefly and helpfully (max 4 sentences), in the same language/script the user used.`;
            const reply = await callGeminiAI(prompt);
            thinking.innerText = reply;
        } catch(e) { aiHandleError(thinking, e); }
    }

    async function aiQuickAction(type) {
        if (type === 'plan') return aiPlanMyDay();
        if (type === 'reschedule') return aiFixOverdue();
        if (type === 'summary') return aiDailySummary();
    }

    async function aiPlanMyDay() {
        appendChatBubble('🪄 Plan My Day', 'user');
        const thinking = appendChatBubble('🤔 Planning your day...', 'ai');
        try {
            const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
            const todayStr = getTodayStr();
            const todayTasks = reminders.filter(r => r.status !== 'completed' && !r.archived && r.time.split('T')[0] === todayStr);
            if (todayTasks.length === 0) {
                thinking.innerText = "🎉 No pending tasks for today! Enjoy your free time.";
                return;
            }
            const list = todayTasks.map(t => `- ${t.task} (priority: ${t.priority||'medium'}, time: ${t.time.split('T')[1]})`).join('\n');
            const prompt = `Here are today's pending tasks:\n${list}\n\nSuggest an optimal order/schedule to complete these today, considering priority and time. Keep it short, friendly, with emojis, max 6 lines.`;
            const reply = await callGeminiAI(prompt);
            thinking.innerText = reply;
        } catch(e) { aiHandleError(thinking, e); }
    }

    async function aiFixOverdue() {
        appendChatBubble('🔄 Fix Overdue Tasks', 'user');
        const thinking = appendChatBubble('🤔 Checking overdue tasks...', 'ai');
        try {
            let reminders = JSON.parse(localStorage.getItem('reminders')) || [];
            const now = new Date();
            const overdue = reminders.filter(r => r.status !== 'completed' && !r.archived && new Date(r.time) < now);
            if (overdue.length === 0) {
                thinking.innerText = "✅ No overdue tasks! You're all caught up.";
                return;
            }
            const list = overdue.map((t,i) => `${i+1}. ${t.task} (was due: ${new Date(t.time).toLocaleString('en-IN')})`).join('\n');
            const prompt = `Current time is ${now.toLocaleString('en-IN')}. These tasks are overdue:\n${list}\n\nFor each numbered task, suggest a new realistic time (later today or tomorrow). Reply ONLY in this exact format, one line per task, no extra text:\n1. YYYY-MM-DD HH:MM\n2. YYYY-MM-DD HH:MM`;
            const reply = await callGeminiAI(prompt);

            const lines = reply.split('\n').map(l => l.trim()).filter(Boolean);
            let applied = 0;
            lines.forEach(line => {
                const m = line.match(/(\d+)\.\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
                if (m) {
                    const idx = parseInt(m[1]) - 1;
                    if (overdue[idx]) {
                        const target = reminders.find(r => r.id === overdue[idx].id);
                        if (target) {
                            target.time = `${m[2]}T${m[3]}`;
                            target.notified = false;
                            applied++;
                        }
                    }
                }
            });
            if (applied > 0) {
                localStorage.setItem('reminders', JSON.stringify(reminders));
                loadReminders();
                renderHomeCalendar();
                syncToCloud();
                thinking.innerText = `✅ Rescheduled ${applied} of ${overdue.length} overdue task(s) to new times!`;
            } else {
                thinking.innerText = "⚠️ Couldn't auto-apply. Try again or reschedule manually using ✏️ Edit.";
            }
        } catch(e) { aiHandleError(thinking, e); }
    }

    async function aiDailySummary() {
        appendChatBubble('📊 Summary', 'user');
        const thinking = appendChatBubble('🤔 Summarizing...', 'ai');
        try {
            const context = buildAIContext();
            const prompt = `${context}\nGive a short, encouraging summary of my day/progress (max 3 sentences) with emojis.`;
            const reply = await callGeminiAI(prompt);
            thinking.innerText = reply;
        } catch(e) { aiHandleError(thinking, e); }
    }

    // ============================================================
    // BATCH 2 — FAMILY CALENDAR
    // ============================================================
    async function openFamilyModal() {
        openModal('familyModal');
        const container = document.getElementById('familyContainer');
        if (!currentUser) {
            container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">Login required.</p>';
            return;
        }
        container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:13px; padding:20px;">Loading...</p>';
        try {
            const [sentSnap, receivedSnap] = await Promise.all([
                db.collection('shared_tasks').where('fromUid','==',currentUser.uid).get(),
                db.collection('shared_tasks').where('toEmail','==',currentUser.email.toLowerCase()).get()
            ]);

            let html = `<div class="family-section-title">📤 You Shared (${sentSnap.size})</div>`;
            if (sentSnap.empty) {
                html += `<p style="font-size:12px; color:#8e8e93;">Nothing shared yet.</p>`;
            } else {
                sentSnap.forEach(doc => {
                    const t = doc.data();
                    const date = t.time ? new Date(t.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
                    const statusBadge = t.status === 'accepted' ? '✅' : '⏳';
                    html += `<div class="family-task-item"><div><b style="font-size:13px;">${t.task}</b><br><span style="font-size:11px; color:#8e8e93;">📧 ${t.toEmail} · 📅 ${date}</span></div><span>${statusBadge}</span></div>`;
                });
            }

            html += `<div class="family-section-title" style="margin-top:18px;">📥 Shared With You (${receivedSnap.size})</div>`;
            if (receivedSnap.empty) {
                html += `<p style="font-size:12px; color:#8e8e93;">Nothing received yet.</p>`;
            } else {
                receivedSnap.forEach(doc => {
                    const t = doc.data();
                    const date = t.time ? new Date(t.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
                    const statusBadge = t.status === 'accepted' ? '✅ Added' : '⏳ Pending';
                    html += `<div class="family-task-item"><div><b style="font-size:13px;">${t.task}</b><br><span style="font-size:11px; color:#8e8e93;">👤 ${t.fromName||'?'} · 📅 ${date}</span></div><span style="font-size:11px; font-weight:700;">${statusBadge}</span></div>`;
                });
            }

            container.innerHTML = html;
        } catch(e) {
            container.innerHTML = `<p style="text-align:center; color:#ff3b30; font-size:13px;">Error: ${e.message}<br><span style="color:#8e8e93; font-size:11px;">Check Firestore index/rules for 'shared_tasks'.</span></p>`;
        }
    }

    // ============================================================
    // BATCH 3 — PRODUCTIVITY HEATMAP
    // ============================================================
    function renderProductivityHeatmap() {
        const grid = document.getElementById('productivityHeatmap');
        if (!grid) return;
        const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const completedByDate = {};
        reminders.filter(r => r.status === 'completed').forEach(r => {
            const d = r.time.split('T')[0];
            completedByDate[d] = (completedByDate[d] || 0) + 1;
        });

        const totalDays = 84; // 12 weeks
        const now = new Date();
        let html = '';
        for (let i = totalDays - 1; i >= 0; i--) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            const dStr = formatDateLocal(d);
            const count = completedByDate[dStr] || 0;
            let color = '#ebedf0';
            if (count === 1) color = '#9be9a8';
            else if (count >= 2 && count <= 3) color = '#40c463';
            else if (count >= 4) color = '#216e39';
            html += `<div class="heatmap-cell" style="background:${color};" title="${dStr}: ${count} done"></div>`;
        }
        grid.innerHTML = html;
    }

    // ============================================================
    // BATCH 3 — HABIT DETAIL: CALENDAR / GRAPH / SCORE / MISSED ANALYSIS
    // ============================================================
    let habitGraphChartInstance = null;

    function openHabitDetail(id) {
        const habits = JSON.parse(localStorage.getItem('habits')) || [];
        const habit = habits.find(h => h.id === id);
        if (!habit) return;
        if (!habit.history) habit.history = [];

        document.getElementById('habitDetailTitle').innerText = `📈 ${habit.name}`;
        document.getElementById('habitDetailStreak').innerText = habit.streak || 0;
        document.getElementById('habitDetailBest').innerText = habit.maxStreak || 0;

        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const last30 = [...Array(30)].map((_,i) => { const d = new Date(todayStart); d.setDate(d.getDate()-i); return formatDateLocal(d); });
        const checkIns30 = last30.filter(d => habit.history.includes(d)).length;
        const rate = Math.round((checkIns30/30)*100);
        document.getElementById('habitDetailRate').innerText = rate + '%';

        const score = Math.round(rate*0.7 + Math.min(habit.streak||0,30)/30*100*0.3);
        const scoreEl = document.getElementById('habitScoreCircle');
        scoreEl.innerText = score;
        const scoreColor = score>=70 ? '#34c759' : score>=40 ? '#ff9500' : '#ff3b30';
        scoreEl.style.background = scoreColor+'22';
        scoreEl.style.color = scoreColor;

        renderHabitCalendar(habit);
        renderHabitGraph(habit);
        renderHabitMissedAnalysis(habit, last30);

        openModal('habitDetailModal');
    }

    function renderHabitCalendar(habit) {
        const grid = document.getElementById('habitCalGrid');
        const now = new Date();
        const year = now.getFullYear(), month = now.getMonth();
        let firstDay = new Date(year, month, 1).getDay();
        let daysInMonth = new Date(year, month+1, 0).getDate();
        const todayStr = getTodayStr();
        let html = '';
        for(let i=0;i<firstDay;i++) html += `<div class="cal-day empty"></div>`;
        for(let i=1;i<=daysInMonth;i++){
            const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const done = habit.history.includes(dStr);
            let cls = 'cal-day';
            if (done) cls += ' habit-done';
            if (dStr === todayStr) cls += ' today';
            html += `<div class="${cls}">${i}</div>`;
        }
        grid.innerHTML = html;
    }

    function renderHabitGraph(habit) {
        const weeks = 8;
        const labels = [];
        const data = [];
        const now = new Date();
        for(let w=weeks-1; w>=0; w--){
            let count = 0;
            for(let d=0; d<7; d++){
                const day = new Date(now);
                day.setDate(day.getDate() - (w*7 + d));
                if (habit.history.includes(formatDateLocal(day))) count++;
            }
            const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - (w*7+6));
            labels.push(`${weekStart.getDate()}/${weekStart.getMonth()+1}`);
            data.push(count);
        }
        const ctx = document.getElementById('habitGraphChart').getContext('2d');
        if (habitGraphChartInstance) habitGraphChartInstance.destroy();
        habitGraphChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Days done', data, backgroundColor: '#34c759', borderRadius: 6 }] },
            options: { scales: { y: { beginAtZero: true, max: 7, ticks: { stepSize: 1 } } } }
        });
    }

    function renderHabitMissedAnalysis(habit, last30) {
        const container = document.getElementById('habitMissedAnalysis');
        const todayStr = getTodayStr();
        const missed = last30.filter(d => d < todayStr && !habit.history.includes(d));

        const sortedHistory = [...habit.history].sort();
        let longestGap = 0;
        for(let i=1; i<sortedHistory.length; i++){
            const diff = (new Date(sortedHistory[i]) - new Date(sortedHistory[i-1])) / 86400000;
            if (diff-1 > longestGap) longestGap = diff-1;
        }

        if (missed.length === 0) {
            container.innerHTML = `<p style="margin:0; color:#34c759; font-weight:700;">🎉 Perfect! No missed days in last 30 days.</p>`;
            return;
        }
        container.innerHTML = `
            <p style="margin:0 0 6px;">⚠️ <b>${missed.length}</b> day(s) missed in last 30 days</p>
            <p style="margin:0 0 6px;">📉 Longest gap ever: <b>${longestGap}</b> day(s)</p>
            <p style="margin:6px 0 0; font-size:11px; color:#8e8e93;">Recent misses: ${missed.slice(-5).map(d=>d.slice(5)).join(', ')}${missed.length>5?'...':''}</p>
        `;
    }

    // ============================================================
    // BATCH 4 — AI PRIORITY SUGGESTION
    // ============================================================
    async function aiSuggestPriority() {
        const task = document.getElementById("taskInput").value.trim();
        if (!task) return showToast("Enter task title first!", "error");
        const notes = document.getElementById("notesInput").innerText.trim();
        showToast("🪄 Analyzing priority...", "info");
        try {
            const prompt = `Task: "${task}"${notes ? '. Notes: ' + notes : ''}.\nClassify how urgent/important this task is. Reply with ONLY one word: high, medium, or low.`;
            const reply = (await callGeminiAI(prompt)).toLowerCase();
            const valid = ['high','medium','low'];
            const pri = valid.find(p => reply.includes(p)) || 'medium';
            document.getElementById("priorityInput").value = pri;
            const emoji = pri === 'high' ? '🔴' : pri === 'low' ? '🟢' : '🟡';
            showToast(`${emoji} AI suggests: ${pri.toUpperCase()} priority`, "success");
        } catch(e) {
            if (e.message === 'NO_KEY') { switchPage('settings'); showToast("Add free Gemini API Key in Settings!", "error"); }
            else showToast("AI Error: " + e.message, "error");
        }
    }

    // ============================================================
    // BATCH 4 — AI AUTO-CATEGORIZATION
    // ============================================================
    function updateCategoryPreview() {
        const badge = document.getElementById("categoryPreviewBadge");
        if (!badge) return;
        const task = document.getElementById("taskInput").value.trim();
        const override = document.getElementById("categoryOverrideInput").value;
        let cat;
        if (override) {
            try { cat = JSON.parse(override); } catch(e) { cat = null; }
        }
        if (!cat) cat = task ? autoCategorizeTask(task) : { name: 'Task', icon: '📝' };
        badge.innerHTML = `${cat.icon} ${cat.name}`;
    }

    async function aiSuggestCategory() {
        const task = document.getElementById("taskInput").value.trim();
        if (!task) return showToast("Enter task title first!", "error");
        showToast("🪄 AI categorizing...", "info");
        try {
            const prompt = `Task: "${task}".\nSuggest ONE short category name (1-2 words) and ONE matching emoji for organizing this task. Reply in EXACTLY this format with no extra text: emoji|CategoryName\nExample: 🎂|Birthday`;
            const reply = await callGeminiAI(prompt);
            const parts = reply.trim().split('|');
            if (parts.length >= 2) {
                const cat = { icon: parts[0].trim(), name: parts[1].trim() };
                document.getElementById("categoryOverrideInput").value = JSON.stringify(cat);
                updateCategoryPreview();
                showToast(`Category set: ${cat.icon} ${cat.name}`, "success");
            } else {
                showToast("Couldn't parse AI response, try again", "error");
            }
        } catch(e) {
            if (e.message === 'NO_KEY') { switchPage('settings'); showToast("Add free Gemini API Key in Settings!", "error"); }
            else showToast("AI Error: " + e.message, "error");
        }
    }

    // ============================================================
    // BATCH 4 — GOAL PREDICTION
    // ============================================================
    function renderGoalPrediction(period) {
        const container = document.getElementById('goalPredictionContainer');
        if (!container) return;

        const days = period === 'month' ? 30 : 7;
        const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const habits = JSON.parse(localStorage.getItem('habits')) || [];
        const dailyGoal = parseInt(localStorage.getItem('dailyTaskGoal')) || 5;

        const dateArr = [...Array(days)].map((_,i) => { const d = new Date(); d.setDate(d.getDate()-(days-1-i)); return formatDateLocal(d); });
        const dateSet = new Set(dateArr);
        const completedCount = reminders.filter(r => r.status === 'completed' && dateSet.has(r.time.split('T')[0])).length;
        const avgPerDay = completedCount / days;
        const projectedMonthly = Math.round(avgPerDay * 30);
        const goalMonthly = dailyGoal * 30;
        const pctOfGoal = goalMonthly > 0 ? Math.round((projectedMonthly/goalMonthly)*100) : 0;

        let statusBadge, statusColor;
        if (pctOfGoal >= 100) { statusBadge = '🚀 Ahead of Goal'; statusColor = '#34c759'; }
        else if (pctOfGoal >= 70) { statusBadge = '✅ On Track'; statusColor = '#007aff'; }
        else { statusBadge = '⚠️ Behind Goal'; statusColor = '#ff9500'; }

        let habitPredictions = '';
        habits.forEach(h => {
            const streak = h.streak || 0;
            const milestones = [7, 30, 100];
            const next = milestones.find(m => m > streak);
            if (streak === 0) {
                habitPredictions += `<div class="report-stat-row"><span style="font-size:13px;">🎯 ${h.name}</span><span style="font-weight:700; color:#8e8e93;">Start today!</span></div>`;
            } else if (next) {
                const daysLeft = next - streak;
                habitPredictions += `<div class="report-stat-row"><span style="font-size:13px;">🎯 ${h.name} → ${next}-day streak</span><span style="font-weight:700; color:var(--primary);">${daysLeft}d left</span></div>`;
            }
        });
        if (!habitPredictions) habitPredictions = '<p style="font-size:12px; color:#8e8e93; margin:0;">No habits tracked yet.</p>';

        container.innerHTML = `
            <div style="text-align:center; margin-bottom:12px;">
                <span style="background:${statusColor}22; color:${statusColor}; padding:6px 16px; border-radius:20px; font-weight:800; font-size:13px;">${statusBadge}</span>
            </div>
            <div class="report-stat-row">
                <span style="font-size:13px; font-weight:600;">📈 Current Pace</span>
                <span style="font-weight:700;">${avgPerDay.toFixed(1)} tasks/day</span>
            </div>
            <div class="report-stat-row" style="border-bottom:none;">
                <span style="font-size:13px; font-weight:600;">🔮 Monthly Projection</span>
                <span style="font-weight:700;">${projectedMonthly} / ${goalMonthly} (${pctOfGoal}%)</span>
            </div>
            <div class="report-bar-track"><div class="report-bar-fill" style="width:${Math.min(pctOfGoal,100)}%; background:${statusColor};"></div></div>

            <div style="margin-top:12px;">
                <p style="font-size:11px; color:#8e8e93; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 8px;">🏁 Habit Milestones</p>
                ${habitPredictions}
            </div>
        `;
    }

    // ============================================================
    // BATCH 5 — KANBAN BOARD
    // ============================================================
    let kanbanSortables = [];

    function openKanbanModal() {
        openModal('kanbanModal');
        renderKanban();
        setTimeout(initKanbanSortable, 150);
    }

    function renderKanban() {
        const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const active = reminders.filter(r => !r.archived);
        const cols = { todo: [], inprogress: [], done: [] };

        active.forEach(r => {
            let col = r.kanbanCol;
            if (!col) col = (r.status === 'completed') ? 'done' : 'todo';
            if (r.status === 'completed') col = 'done';
            if (!cols[col]) cols[col] = [];
            cols[col].push(r);
        });

        ['todo','inprogress','done'].forEach(col => {
            const idSuffix = col.charAt(0).toUpperCase() + col.slice(1);
            const container = document.getElementById('kanbanCol' + idSuffix);
            const countEl = document.getElementById('kanbanCount' + idSuffix);
            const list = cols[col] || [];
            countEl.innerText = list.length;
            container.innerHTML = list.map(r => {
                const prioColor = r.priority === 'high' ? '#ff3b30' : r.priority === 'low' ? '#34c759' : '#ff9500';
                const dateStr = r.time ? new Date(r.time).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '';
                return `<div class="kanban-card" data-id="${r.id}">
                    <div class="kanban-card-title"><span class="kanban-priority-dot" style="background:${prioColor};"></span>${r.task}</div>
                    <div style="font-size:10px; color:#8e8e93; margin-top:4px;">📅 ${dateStr}</div>
                </div>`;
            }).join('') || `<p style="text-align:center; font-size:11px; color:#8e8e93; padding:25px 0;">Empty</p>`;
        });
    }

    function initKanbanSortable() {
        kanbanSortables.forEach(s => s.destroy());
        kanbanSortables = [];
        ['kanbanColTodo','kanbanColInprogress','kanbanColDone'].forEach(id => {
            const el = document.getElementById(id);
            const s = new Sortable(el, {
                group: 'kanban',
                animation: 150,
                delay: 100,
                delayOnTouchOnly: true,
                onEnd: function(evt) {
                    const taskId = Number(evt.item.getAttribute('data-id'));
                    const newCol = evt.to.getAttribute('data-col');
                    updateKanbanCard(taskId, newCol);
                }
            });
            kanbanSortables.push(s);
        });
    }

    function updateKanbanCard(id, newCol) {
        let reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const r = reminders.find(x => x.id === id);
        if (!r) return;
        r.kanbanCol = newCol;
        r.status = (newCol === 'done') ? 'completed' : 'pending';
        localStorage.setItem('reminders', JSON.stringify(reminders));
        renderKanban();
        loadReminders();
        syncToCloud();
    }

    // ============================================================
    // BATCH 5 — PROJECT PROGRESS / MILESTONES / TIMELINE (GANTT-LITE)
    // ============================================================
    let currentProjectDetailId = null;

    function openProjectDetail(projectId) {
        currentProjectDetailId = projectId;
        const projects = JSON.parse(localStorage.getItem('projects')) || [];
        const proj = projects.find(p => p.id === projectId);
        if (!proj) return;
        if (!proj.milestones) proj.milestones = [];

        document.getElementById('projectDetailTitle').innerHTML = `${proj.emoji} ${proj.name}`;
        renderProjectDetailProgress(proj);
        renderProjectTimeline(proj);
        renderMilestones(proj);
        openModal('projectDetailModal');
    }

    function renderProjectDetailProgress(proj) {
        const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const tasks = reminders.filter(r => String(r.project) === String(proj.id) && !r.archived);
        const completed = tasks.filter(r => r.status === 'completed').length;
        const pct = tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0;
        document.getElementById('projectDetailProgress').innerHTML = `
            <div class="report-stat-row" style="border-bottom:none; padding-bottom:4px;">
                <span style="font-size:13px; font-weight:600;">Progress</span>
                <span style="font-weight:800; color:${proj.color};">${completed}/${tasks.length} (${pct}%)</span>
            </div>
            <div class="project-progress-track" style="height:8px;"><div class="project-progress-fill" style="width:${pct}%; background:${proj.color};"></div></div>
        `;
    }

    function renderProjectTimeline(proj) {
        const container = document.getElementById('projectTimeline');
        const reminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const tasks = reminders.filter(r => String(r.project) === String(proj.id) && !r.archived && r.time);
        const milestones = proj.milestones || [];

        const allDates = tasks.map(t => new Date(t.time)).concat(milestones.map(m => new Date(m.date + 'T00:00:00')));
        if (allDates.length === 0) {
            container.style.width = '100%';
            container.innerHTML = '<p style="position:absolute; top:-6px; width:100%; text-align:center; font-size:12px; color:#8e8e93;">No dated tasks/milestones yet.</p>';
            return;
        }
        allDates.push(new Date());

        let minDate = new Date(Math.min(...allDates));
        let maxDate = new Date(Math.max(...allDates));
        minDate.setHours(0,0,0,0); minDate.setDate(minDate.getDate()-1);
        maxDate.setHours(0,0,0,0); maxDate.setDate(maxDate.getDate()+1);
        const totalMs = Math.max(1, maxDate - minDate);
        const totalDays = Math.max(1, Math.ceil(totalMs/86400000));
        const widthPerDay = 36;
        container.style.width = Math.max(totalDays*widthPerDay, 280) + 'px';

        let html = '';
        const labelStep = Math.max(1, Math.ceil(totalDays/8));
        for(let d=0; d<=totalDays; d+=labelStep){
            const dt = new Date(minDate); dt.setDate(dt.getDate()+d);
            const pct = (d/totalDays)*100;
            html += `<div class="timeline-date-label" style="left:${pct}%;">${dt.getDate()}/${dt.getMonth()+1}</div>`;
        }
        tasks.forEach(t => {
            const pos = ((new Date(t.time) - minDate)/totalMs)*100;
            const color = t.status === 'completed' ? '#34c759' : (t.priority === 'high' ? '#ff3b30' : t.priority === 'low' ? '#34c759' : '#ff9500');
            html += `<div class="timeline-marker" style="left:${pos}%; background:${color};" title="${t.task}"></div>`;
        });
        milestones.forEach(m => {
            const pos = ((new Date(m.date + 'T00:00:00') - minDate)/totalMs)*100;
            html += `<div class="timeline-milestone" style="left:${pos}%; background:${m.done ? '#34c759' : '#5e5ce6'};" title="🏁 ${m.name}"></div>`;
        });
        const todayPos = ((new Date() - minDate)/totalMs)*100;
        html += `<div class="timeline-today" style="left:${todayPos}%;" title="Today"></div>`;

        container.innerHTML = html;
    }

    function addMilestone() {
        const name = document.getElementById('milestoneNameInput').value.trim();
        const date = document.getElementById('milestoneDateInput').value;
        if (!name || !date) return showToast('Enter milestone name & date!', 'error');
        let projects = JSON.parse(localStorage.getItem('projects')) || [];
        const proj = projects.find(p => p.id === currentProjectDetailId);
        if (!proj) return;
        if (!proj.milestones) proj.milestones = [];
        proj.milestones.push({ id: Date.now(), name, date, done: false });
        localStorage.setItem('projects', JSON.stringify(projects));
        document.getElementById('milestoneNameInput').value = '';
        document.getElementById('milestoneDateInput').value = '';
        renderMilestones(proj);
        renderProjectTimeline(proj);
        syncToCloud();
        showToast('Milestone added! 🏁', 'success');
    }

    function toggleMilestone(id) {
        let projects = JSON.parse(localStorage.getItem('projects')) || [];
        const proj = projects.find(p => p.id === currentProjectDetailId);
        if (!proj || !proj.milestones) return;
        const m = proj.milestones.find(x => x.id === id);
        if (m) m.done = !m.done;
        localStorage.setItem('projects', JSON.stringify(projects));
        renderMilestones(proj);
        renderProjectTimeline(proj);
        syncToCloud();
    }

    function deleteMilestone(id) {
        let projects = JSON.parse(localStorage.getItem('projects')) || [];
        const proj = projects.find(p => p.id === currentProjectDetailId);
        if (!proj || !proj.milestones) return;
        proj.milestones = proj.milestones.filter(x => x.id !== id);
        localStorage.setItem('projects', JSON.stringify(projects));
        renderMilestones(proj);
        renderProjectTimeline(proj);
        syncToCloud();
    }

    function renderMilestones(proj) {
        const container = document.getElementById('milestonesContainer');
        const milestones = (proj.milestones || []).slice().sort((a,b) => new Date(a.date) - new Date(b.date));
        if (milestones.length === 0) {
            container.innerHTML = '<p style="font-size:12px; color:#8e8e93; text-align:center; padding:10px 0;">No milestones yet. Add one above! 🏁</p>';
            return;
        }
        container.innerHTML = milestones.map(m => `
            <div class="milestone-item ${m.done ? 'done' : ''}">
                <input type="checkbox" ${m.done ? 'checked' : ''} onchange="toggleMilestone(${m.id})" style="width:18px; height:18px; margin:0; flex-shrink:0;">
                <span class="milestone-name" style="flex:1;">${m.name}</span>
                <span style="font-size:11px; color:#8e8e93;">${new Date(m.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>
                <button onclick="deleteMilestone(${m.id})" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:15px; padding:0;">✖</button>
            </div>
        `).join('');
    }

    // ============================================================
    // BATCH 5 — SHARED WORKSPACE (Family Shared Lists / Team Workspace)
    // ============================================================
    function generateWorkspaceCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for(let i=0;i<6;i++) code += chars[Math.floor(Math.random()*chars.length)];
        return code;
    }

    async function openWorkspaceModal() {
        openModal('workspaceModal');
        await loadActiveWorkspace();
    }

    async function loadActiveWorkspace() {
        const active = JSON.parse(localStorage.getItem('activeWorkspace') || 'null');
        if (!active) {
            document.getElementById('workspaceSetup').style.display = 'block';
            document.getElementById('workspaceActive').style.display = 'none';
            return;
        }
        document.getElementById('workspaceSetup').style.display = 'none';
        document.getElementById('workspaceActive').style.display = 'block';
        document.getElementById('workspaceActiveName').innerText = active.name;
        document.getElementById('workspaceActiveCode').innerText = active.code;
        await syncWorkspace();
    }

    async function createWorkspace() {
        if (!currentUser) return showToast('Login required!', 'error');
        const name = document.getElementById('workspaceNameInput').value.trim();
        if (!name) return showToast('Enter workspace name!', 'error');
        const code = generateWorkspaceCode();
        try {
            await db.collection('workspaces').doc(code).set({
                name, members: [currentUser.email.toLowerCase()], tasks: [],
                createdAt: new Date().toISOString(), ownerUid: currentUser.uid
            });
            localStorage.setItem('activeWorkspace', JSON.stringify({code, name}));
            showToast(`Workspace created! Code: ${code} 🎉`, 'success');
            await loadActiveWorkspace();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    async function joinWorkspace() {
        if (!currentUser) return showToast('Login required!', 'error');
        const code = document.getElementById('workspaceJoinCode').value.trim().toUpperCase();
        if (!code) return showToast('Enter a code!', 'error');
        try {
            const ref = db.collection('workspaces').doc(code);
            const doc = await ref.get();
            if (!doc.exists) return showToast('Workspace not found!', 'error');
            const data = doc.data();
            const email = currentUser.email.toLowerCase();
            if (!(data.members||[]).includes(email)) {
                await ref.update({ members: [...(data.members||[]), email] });
            }
            localStorage.setItem('activeWorkspace', JSON.stringify({code, name: data.name}));
            showToast(`Joined "${data.name}"! 🎉`, 'success');
            await loadActiveWorkspace();
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    function leaveWorkspace() {
        localStorage.removeItem('activeWorkspace');
        document.getElementById('workspaceSetup').style.display = 'block';
        document.getElementById('workspaceActive').style.display = 'none';
        showToast('Left workspace', 'info');
    }

    async function syncWorkspace() {
        const active = JSON.parse(localStorage.getItem('activeWorkspace') || 'null');
        if (!active) return;
        try {
            const doc = await db.collection('workspaces').doc(active.code).get();
            if (!doc.exists) { showToast('Workspace no longer exists', 'error'); leaveWorkspace(); return; }
            const data = doc.data();
            document.getElementById('workspaceMemberCount').innerText = (data.members||[]).length;
            renderWorkspaceTasks(data.tasks || []);
        } catch(e) { showToast('Sync error: ' + e.message, 'error'); }
    }

    function renderWorkspaceTasks(tasks) {
        const container = document.getElementById('workspaceTasksContainer');
        if (tasks.length === 0) {
            container.innerHTML = '<p style="text-align:center; font-size:12px; color:#8e8e93; padding:15px 0;">No shared tasks yet. Add one! 👆</p>';
            return;
        }
        container.innerHTML = tasks.map(t => `
            <div class="workspace-task-item ${t.done ? 'done' : ''}">
                <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleWorkspaceTask('${t.id}')" style="width:18px; height:18px; margin:0; flex-shrink:0;">
                <span class="workspace-task-text" style="flex:1; font-size:13px;">${t.text}</span>
                <span style="font-size:10px; color:#8e8e93;">${t.addedBy || ''}</span>
                <button onclick="deleteWorkspaceTask('${t.id}')" style="background:none; border:none; color:#ff3b30; cursor:pointer; font-size:15px; padding:0;">✖</button>
            </div>
        `).join('');
    }

    async function addWorkspaceTask() {
        const active = JSON.parse(localStorage.getItem('activeWorkspace') || 'null');
        if (!active) return;
        const input = document.getElementById('workspaceTaskInput');
        const text = input.value.trim();
        if (!text) return;
        try {
            const ref = db.collection('workspaces').doc(active.code);
            const doc = await ref.get();
            const tasks = doc.data().tasks || [];
            tasks.push({ id: Date.now().toString(), text, done: false, addedBy: userName });
            await ref.update({ tasks });
            input.value = '';
            renderWorkspaceTasks(tasks);
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    async function toggleWorkspaceTask(id) {
        const active = JSON.parse(localStorage.getItem('activeWorkspace') || 'null');
        if (!active) return;
        try {
            const ref = db.collection('workspaces').doc(active.code);
            const doc = await ref.get();
            const tasks = doc.data().tasks || [];
            const t = tasks.find(x => x.id === id);
            if (t) t.done = !t.done;
            await ref.update({ tasks });
            renderWorkspaceTasks(tasks);
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    async function deleteWorkspaceTask(id) {
        const active = JSON.parse(localStorage.getItem('activeWorkspace') || 'null');
        if (!active) return;
        try {
            const ref = db.collection('workspaces').doc(active.code);
            const doc = await ref.get();
            let tasks = doc.data().tasks || [];
            tasks = tasks.filter(x => x.id !== id);
            await ref.update({ tasks });
            renderWorkspaceTasks(tasks);
        } catch(e) { showToast('Error: ' + e.message, 'error'); }
    }

    // ============================================================
    // SHIFT SCHEDULE
    // ============================================================
    function getShiftConfig() {
        let cfg = JSON.parse(localStorage.getItem('shiftConfig') || 'null');
        if (!cfg) {
            cfg = {
                types: [
                    { id: 1, name: 'Morning', icon: '🌅', color: '#ff9500', start: '06:00', end: '14:00' },
                    { id: 2, name: 'Evening', icon: '🌇', color: '#5e5ce6', start: '14:00', end: '22:00' },
                    { id: 3, name: 'Night',   icon: '🌙', color: '#007aff', start: '22:00', end: '06:00' },
                    { id: 4, name: 'Off',     icon: '🏖️', color: '#34c759', start: null,    end: null }
                ],
                pattern: [],
                patternStart: getTodayStr(),
                overrides: {},
                reminderEnabled: false,
                reminderMinutes: 60
            };
            localStorage.setItem('shiftConfig', JSON.stringify(cfg));
        }
        if (!cfg.overrides) cfg.overrides = {};
        if (!cfg.pattern) cfg.pattern = [];
        return cfg;
    }

    function saveShiftConfig(cfg, sync = true) {
        localStorage.setItem('shiftConfig', JSON.stringify(cfg));
        if (sync) syncToCloud();
    }

    function getShiftForDate(dateStr) {
        const cfg = getShiftConfig();
        if (cfg.overrides[dateStr] !== undefined) {
            return cfg.types.find(t => t.id === cfg.overrides[dateStr]) || null;
        }
        if (cfg.pattern.length === 0 || !cfg.patternStart) return null;
        const start = new Date(cfg.patternStart + 'T00:00:00');
        const target = new Date(dateStr + 'T00:00:00');
        let diffDays = Math.round((target - start) / 86400000);
        diffDays = ((diffDays % cfg.pattern.length) + cfg.pattern.length) % cfg.pattern.length;
        const typeId = cfg.pattern[diffDays];
        return cfg.types.find(t => t.id === typeId) || null;
    }

    // --- Today's Shift Home Widget ---
    function renderTodayShiftWidget() {
        const card = document.getElementById('todayShiftCard');
        if (!card) return;
        const todayStr = getTodayStr();
        const shift = getShiftForDate(todayStr);

        if (!shift) {
            document.getElementById('shiftCardIcon').innerText = '🔄';
            document.getElementById('shiftCardName').innerText = 'Set up Shift Schedule';
            document.getElementById('shiftCardTime').innerText = 'Tap to configure your rotation 👆';
            document.getElementById('shiftCardNext').innerText = '';
            return;
        }
        document.getElementById('shiftCardIcon').innerText = shift.icon;
        document.getElementById('shiftCardName').innerText = shift.name + (shift.start ? ' Shift' : '');
        document.getElementById('shiftCardTime').innerText = shift.start ? `${shift.start} – ${shift.end}` : 'Day off 🎉 Enjoy!';

        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
        const nextShift = getShiftForDate(formatDateLocal(tomorrow));
        document.getElementById('shiftCardNext').innerHTML = nextShift ? `Tomorrow<br>${nextShift.icon} ${nextShift.name}` : '';
    }

    // --- Shift Modal & Tabs ---
    function openShiftModal() {
        const cfg = getShiftConfig();
        document.getElementById('shiftReminderToggle').checked = cfg.reminderEnabled;
        document.getElementById('shiftReminderMinutes').value = cfg.reminderMinutes;
        document.getElementById('shiftReminderMinutesWrap').style.display = cfg.reminderEnabled ? 'block' : 'none';
        renderShiftTypes();
        setShiftTab('setup');
        openModal('shiftModal');
    }

    function setShiftTab(tab) {
        document.querySelectorAll('.shift-view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('shifttab-' + tab).classList.add('active');
        document.getElementById('shiftTabSetup').style.display = (tab === 'setup') ? 'block' : 'none';
        document.getElementById('shiftTabCalendar').style.display = (tab === 'calendar') ? 'block' : 'none';
        if (tab === 'calendar') renderShiftCalendar();
    }

    // --- Shift Types ---
    function renderShiftTypes() {
        const cfg = getShiftConfig();
        const container = document.getElementById('shiftTypesContainer');
        container.innerHTML = cfg.types.map(t => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f2f2f7; padding:10px 12px; border-radius:10px; margin-bottom:6px;">
                <div style="display:flex; align-items:center; gap:8px; font-size:13px;">
                    <div style="width:10px; height:10px; border-radius:50%; background:${t.color}; flex-shrink:0;"></div>
                    <span>${t.icon} <b>${t.name}</b></span>
                    <span style="font-size:11px; color:#8e8e93;">${t.start ? t.start+'–'+t.end : 'All day off'}</span>
                </div>
                <button onclick="deleteShiftType(${t.id})" style="background:#ffe5e5; color:#ff3b30; border:none; border-radius:8px; padding:5px 9px; cursor:pointer; font-size:12px;">🗑️</button>
            </div>
        `).join('');
        renderShiftPatternBuilder();
    }

    function addShiftType() {
        const name = document.getElementById('newShiftName').value.trim();
        if (!name) return showToast('Enter shift name!', 'error');
        const start = document.getElementById('newShiftStart').value || null;
        const end = document.getElementById('newShiftEnd').value || null;
        const icon = document.getElementById('newShiftEmoji').value.trim() || '🔄';
        const color = document.getElementById('newShiftColor').value || '#007aff';

        const cfg = getShiftConfig();
        cfg.types.push({ id: Date.now(), name, icon, color, start, end });
        saveShiftConfig(cfg);

        document.getElementById('newShiftName').value = '';
        document.getElementById('newShiftStart').value = '';
        document.getElementById('newShiftEnd').value = '';
        document.getElementById('newShiftEmoji').value = '';
        renderShiftTypes();
        showToast('Shift type added! ✅', 'success');
    }

    function deleteShiftType(id) {
        const cfg = getShiftConfig();
        cfg.types = cfg.types.filter(t => t.id !== id);
        cfg.pattern = cfg.pattern.filter(pid => pid !== id);
        Object.keys(cfg.overrides).forEach(d => { if (cfg.overrides[d] === id) delete cfg.overrides[d]; });
        saveShiftConfig(cfg);
        renderShiftTypes();
        renderTodayShiftWidget();
        syncShiftReminders();
        showToast('Shift type removed', 'info');
    }

    // --- Rotation Pattern ---
    function renderShiftPatternBuilder() {
        const cfg = getShiftConfig();
        const builder = document.getElementById('shiftPatternBuilder');
        builder.innerHTML = cfg.types.map(t =>
            `<button class="shift-type-chip" style="background:${t.color}22; color:${t.color};" onclick="addToPattern(${t.id})">${t.icon} ${t.name}</button>`
        ).join('');
        renderShiftPatternSequence();
    }

    function renderShiftPatternSequence() {
        const cfg = getShiftConfig();
        const container = document.getElementById('shiftPatternSequence');
        if (cfg.pattern.length === 0) {
            container.innerHTML = '<span style="font-size:12px; color:#8e8e93; padding:6px;">Tap chips above to build your cycle (e.g. 🌅🌅🌇🌇🌙🌙🏖️🏖️)</span>';
        } else {
            container.innerHTML = cfg.pattern.map((typeId, idx) => {
                const t = cfg.types.find(x => x.id === typeId);
                if (!t) return '';
                return `<span class="shift-pattern-item" style="background:${t.color};">${idx+1}. ${t.icon}<span class="remove-x" onclick="removeFromPattern(${idx})">✖</span></span>`;
            }).join('');
        }
        document.getElementById('shiftPatternStartDate').value = cfg.patternStart || getTodayStr();
    }

    function addToPattern(typeId) {
        const cfg = getShiftConfig();
        cfg.pattern.push(typeId);
        saveShiftConfig(cfg);
        renderShiftPatternSequence();
        renderTodayShiftWidget();
        syncShiftReminders();
    }

    function removeFromPattern(idx) {
        const cfg = getShiftConfig();
        cfg.pattern.splice(idx, 1);
        saveShiftConfig(cfg);
        renderShiftPatternSequence();
        renderTodayShiftWidget();
        syncShiftReminders();
    }

    function saveShiftPattern() {
        const cfg = getShiftConfig();
        cfg.patternStart = document.getElementById('shiftPatternStartDate').value || getTodayStr();
        saveShiftConfig(cfg);
        renderTodayShiftWidget();
        syncShiftReminders();
        showToast('Pattern start date saved!', 'success');
    }

    // --- Shift Reminder Settings ---
    function saveShiftReminderSettings() {
        const cfg = getShiftConfig();
        cfg.reminderEnabled = document.getElementById('shiftReminderToggle').checked;
        cfg.reminderMinutes = parseInt(document.getElementById('shiftReminderMinutes').value) || 60;
        document.getElementById('shiftReminderMinutesWrap').style.display = cfg.reminderEnabled ? 'block' : 'none';
        saveShiftConfig(cfg);
        syncShiftReminders();
        showToast(cfg.reminderEnabled ? '🔔 Shift reminders ON' : 'Shift reminders OFF', 'info');
    }

    // --- Auto-generate Shift Reminders (next 14 days) ---
    function syncShiftReminders() {
        const cfg = getShiftConfig();
        const todayStr = getTodayStr();
        let reminders = JSON.parse(localStorage.getItem('reminders')) || [];

        // Remove future un-completed auto-generated shift reminders (regenerate fresh)
        reminders = reminders.filter(r => !(r.shiftGenerated && r.status !== 'completed' && r.time.split('T')[0] >= todayStr));

        if (cfg.reminderEnabled) {
            const pad = n => String(n).padStart(2,'0');
            for (let i = 0; i < 14; i++) {
                const d = new Date(); d.setDate(d.getDate() + i);
                const dStr = formatDateLocal(d);
                const shift = getShiftForDate(dStr);
                if (!shift || !shift.start) continue;

                const [h, m] = shift.start.split(':').map(Number);
                const shiftDateTime = new Date(d); shiftDateTime.setHours(h, m, 0, 0);
                const remindAt = new Date(shiftDateTime.getTime() - cfg.reminderMinutes * 60000);
                if (remindAt < new Date()) continue;

                const timeStr = `${remindAt.getFullYear()}-${pad(remindAt.getMonth()+1)}-${pad(remindAt.getDate())}T${pad(remindAt.getHours())}:${pad(remindAt.getMinutes())}`;
                reminders.push({
                    id: Date.now() + i,
                    task: `${shift.icon} ${shift.name} Shift starts at ${shift.start}`,
                    notes: `Get ready! ${shift.name} shift: ${shift.start} – ${shift.end}`,
                    time: timeStr, priority: 'medium', repeat: 'none', status: 'pending',
                    notified: false, pinned: false, tags: 'shift', preAlarm: 0,
                    category: { name: 'Shift', icon: '🔄' }, shiftGenerated: true
                });
            }
        }

        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders();
        renderHomeCalendar();
        syncToCloud();
    }

    // --- Shift Calendar (Preview + Override) ---
    let shiftCalMonth = new Date().getMonth();
    let shiftCalYear = new Date().getFullYear();

    function changeShiftCalMonth(dir) {
        shiftCalMonth += dir;
        if (shiftCalMonth > 11) { shiftCalMonth = 0; shiftCalYear++; }
        if (shiftCalMonth < 0) { shiftCalMonth = 11; shiftCalYear--; }
        renderShiftCalendar();
    }

    function renderShiftCalendar() {
        const grid = document.getElementById('shiftCalGrid');
        if (!grid) return;
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        document.getElementById('shiftCalMonthDisplay').innerText = `${monthNames[shiftCalMonth]} ${shiftCalYear}`;

        const cfg = getShiftConfig();
        let firstDay = new Date(shiftCalYear, shiftCalMonth, 1).getDay();
        let daysInMonth = new Date(shiftCalYear, shiftCalMonth + 1, 0).getDate();
        const todayStr = getTodayStr();

        let html = '';
        for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
        for (let i = 1; i <= daysInMonth; i++) {
            const dStr = `${shiftCalYear}-${String(shiftCalMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const shift = getShiftForDate(dStr);
            const isToday = dStr === todayStr;
            const isOverride = cfg.overrides[dStr] !== undefined;
            let style = shift ? `background:${shift.color}22; color:${shift.color};` : '';
            let cls = 'cal-day';
            if (isToday) cls += ' today';
            html += `<div class="${cls}" style="${style} position:relative;" onclick="openShiftOverride('${dStr}')">
                ${i}${shift ? `<span style="position:absolute; bottom:2px; right:3px; font-size:9px;">${shift.icon}</span>` : ''}
                ${isOverride ? `<span style="position:absolute; top:1px; left:3px; font-size:8px;">📌</span>` : ''}
            </div>`;
        }
        grid.innerHTML = html;

        const legend = document.getElementById('shiftCalLegend');
        legend.innerHTML = cfg.types.map(t =>
            `<span class="shift-legend-item"><span class="shift-legend-dot" style="background:${t.color};"></span>${t.icon} ${t.name}</span>`
        ).join('');
    }

    let shiftOverrideDate = null;

    function openShiftOverride(dateStr) {
        shiftOverrideDate = dateStr;
        const cfg = getShiftConfig();
        const dt = new Date(dateStr + 'T00:00:00');
        document.getElementById('shiftOverrideDateLabel').innerText = dt.toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'short'});

        let html = cfg.types.map(t =>
            `<button class="shift-override-btn" onclick="setShiftOverride(${t.id})"><span style="font-size:20px;">${t.icon}</span> ${t.name}</button>`
        ).join('');
        if (cfg.overrides[dateStr] !== undefined) {
            html += `<button class="shift-override-btn" style="color:var(--primary);" onclick="setShiftOverride('auto')">🔄 Reset to Rotation</button>`;
        }
        document.getElementById('shiftOverrideOptions').innerHTML = html;
        openModal('shiftOverrideModal');
    }

    function setShiftOverride(typeIdOrAuto) {
        const cfg = getShiftConfig();
        if (typeIdOrAuto === 'auto') {
            delete cfg.overrides[shiftOverrideDate];
        } else {
            cfg.overrides[shiftOverrideDate] = Number(typeIdOrAuto);
        }
        saveShiftConfig(cfg);
        closeModal('shiftOverrideModal');
        renderShiftCalendar();
        renderTodayShiftWidget();
        syncShiftReminders();
        showToast('Shift updated! 🔄', 'success');
    }

    // FINANCE
    function getFinData(){return JSON.parse(localStorage.getItem('finData')||'{"expenses":[],"income":[],"budgets":[],"bills":[],"emis":[],"investments":[]}')}
    function saveFinData(d){localStorage.setItem('finData',JSON.stringify(d));syncToCloud()}
    function setFinTab(tab){document.querySelectorAll('.fin-tab-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('[id^="finTab-"]').forEach(el=>el.style.display='none');const btn=document.querySelector(`.fin-tab-btn[onclick*="'${tab}'"]`);if(btn)btn.classList.add('active');const el=document.getElementById('finTab-'+tab);if(el)el.style.display='block';if(tab==='expenses')renderExpenses();if(tab==='income')renderIncome();if(tab==='budget')renderBudgets();if(tab==='bills')renderBills();if(tab==='emi')renderEMIs();if(tab==='invest')renderInvestments()}
    function renderFinanceDashboard(){const d=getFinData();const now=new Date();const ms=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const mExp=d.expenses.filter(e=>e.date&&e.date.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0);const mInc=d.income.filter(e=>e.date&&e.date.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0);const emi=d.emis.reduce((s,e)=>s+Number(e.amount),0);const tb=d.budgets.reduce((s,b)=>s+Number(b.limit),0);const fi=document.getElementById('finIncome');const fe=document.getElementById('finExpense');const fs=document.getElementById('finSavings');const fb=document.getElementById('finBudgetLeft');if(fi)fi.innerText='₹'+mInc.toLocaleString('en-IN');if(fe)fe.innerText='₹'+mExp.toLocaleString('en-IN');if(fs)fs.innerText='₹'+Math.max(0,mInc-mExp-emi).toLocaleString('en-IN');if(fb)fb.innerText='₹'+Math.max(0,tb-mExp).toLocaleString('en-IN');renderExpenses()}
    function addExpense(type){const iE=type==='expense';const name=document.getElementById(iE?'expNameInput':'incNameInput').value.trim();const amt=Number(document.getElementById(iE?'expAmtInput':'incAmtInput').value);const cat=document.getElementById(iE?'expCatInput':'incCatInput').value;const date=document.getElementById(iE?'expDateInput':'incDateInput').value||getTodayStr();if(!name||!amt)return showToast('Enter name & amount!','error');const d=getFinData();d[iE?'expenses':'income'].unshift({id:Date.now(),name,amount:amt,category:cat,date,type});saveFinData(d);document.getElementById(iE?'expNameInput':'incNameInput').value='';document.getElementById(iE?'expAmtInput':'incAmtInput').value='';renderFinanceDashboard();if(!iE)renderIncome();showToast(iE?'💸 Added!':'💵 Added!','success')}
    function renderExpenses(){const c=document.getElementById('expensesList');if(!c)return;const d=getFinData();c.innerHTML=d.expenses.slice(0,20).map(e=>`<div class="expense-item"><div><b style="font-size:13px">${e.name}</b><br><span style="font-size:11px;color:#8e8e93">${e.category}·${e.date}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#ff3b30">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('expenses',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:16px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No expenses yet.</p>'}
    function renderIncome(){const c=document.getElementById('incomeList');if(!c)return;const d=getFinData();c.innerHTML=d.income.slice(0,20).map(e=>`<div class="expense-item"><div><b style="font-size:13px">${e.name}</b><br><span style="font-size:11px;color:#8e8e93">${e.category}·${e.date}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#34c759">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('income',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:16px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No income.</p>'}
    function addBudget(){const cat=document.getElementById('budgetCatInput').value.trim();const limit=Number(document.getElementById('budgetAmtInput').value);if(!cat||!limit)return showToast('Enter category & limit!','error');const d=getFinData();d.budgets=d.budgets.filter(b=>b.cat!==cat);d.budgets.push({cat,limit});saveFinData(d);renderBudgets();document.getElementById('budgetCatInput').value='';document.getElementById('budgetAmtInput').value='';showToast('Budget set!','success')}
    function renderBudgets(){const c=document.getElementById('budgetList');if(!c)return;const d=getFinData();const now=new Date();const ms=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const bc={};d.expenses.filter(e=>e.date&&e.date.startsWith(ms)).forEach(e=>{bc[e.category]=(bc[e.category]||0)+Number(e.amount)});c.innerHTML=d.budgets.map(b=>{const sp=bc[b.cat]||0;const pct=Math.min(100,Math.round((sp/b.limit)*100));const col=pct>=90?'#ff3b30':pct>=70?'#ff9500':'#34c759';return`<div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:6px"><span>${b.cat}</span><span style="color:${col}">₹${sp.toLocaleString('en-IN')}/₹${Number(b.limit).toLocaleString('en-IN')} (${pct}%)</span></div><div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%;background:${col}"></div></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No budgets set.</p>'}
    function addBill(){const name=document.getElementById('billNameInput').value.trim();const amt=Number(document.getElementById('billAmtInput').value);const due=document.getElementById('billDueInput').value;const type=document.getElementById('billTypeInput').value;if(!name||!due)return showToast('Enter name & due date!','error');const d=getFinData();d.bills.unshift({id:Date.now(),name,amount:amt,due,type,paid:false});saveFinData(d);renderBills();document.getElementById('billNameInput').value='';document.getElementById('billAmtInput').value='';showToast('Bill added!','success')}
    function renderBills(){const c=document.getElementById('billsList');if(!c)return;const d=getFinData();const today=getTodayStr();c.innerHTML=d.bills.map(b=>{const dl=Math.ceil((new Date(b.due)-new Date(today))/86400000);const urg=dl<0?'bill-urgent':dl<=3?'bill-upcoming':'';return`<div class="bill-item ${urg}"><div><b style="font-size:13px">${b.type} ${b.name}</b><br><span style="font-size:11px;color:#8e8e93">Due:${b.due}·${dl<0?'⚠️Overdue':dl===0?'🔴Today!':dl+'d'}</span></div><div style="display:flex;align-items:center;gap:8px">${b.amount?`<span style="font-weight:700">₹${Number(b.amount).toLocaleString('en-IN')}</span>`:''}<button onclick="toggleBillPaid(${b.id})" style="background:${b.paid?'#e5e5ea':'#e5f9e9'};color:${b.paid?'#8e8e93':'#34c759'};border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer">${b.paid?'Paid ✅':'Pay'}</button><button onclick="deleteFinEntry('bills',${b.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No bills.</p>'}
    function toggleBillPaid(id){const d=getFinData();const b=d.bills.find(x=>x.id===id);if(b)b.paid=!b.paid;saveFinData(d);renderBills()}
    function addEMI(){const name=document.getElementById('emiNameInput').value.trim();const amt=Number(document.getElementById('emiAmtInput').value);const due=document.getElementById('emiDueInput').value;const months=Number(document.getElementById('emiMonthsInput').value);if(!name||!amt)return showToast('Enter name & EMI!','error');const d=getFinData();d.emis.unshift({id:Date.now(),name,amount:amt,due:due?due.slice(8,10):'1',monthsLeft:months});saveFinData(d);renderEMIs();document.getElementById('emiNameInput').value='';document.getElementById('emiAmtInput').value='';showToast('EMI added!','success')}
    function renderEMIs(){const c=document.getElementById('emiList');if(!c)return;const d=getFinData();const total=d.emis.reduce((s,e)=>s+Number(e.amount),0);c.innerHTML=(total?`<div style="background:#ffe5e5;border-radius:12px;padding:10px;margin-bottom:10px;text-align:center"><b style="color:#ff3b30">Total EMI/month: ₹${total.toLocaleString('en-IN')}</b></div>`:'')+d.emis.map(e=>`<div class="bill-item"><div><b style="font-size:13px">${e.name}</b><br><span style="font-size:11px;color:#8e8e93">Day:${e.due}·${e.monthsLeft||'?'} mo left</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#ff3b30">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('emis',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No EMIs.</p>'}
    function addInvestment(){const name=document.getElementById('invNameInput').value.trim();const amt=Number(document.getElementById('invAmtInput').value);const type=document.getElementById('invTypeInput').value;const ret=Number(document.getElementById('invReturnInput').value);if(!name||!amt)return showToast('Enter name & amount!','error');const d=getFinData();d.investments.unshift({id:Date.now(),name,amount:amt,type,returnPct:ret});saveFinData(d);renderInvestments();document.getElementById('invNameInput').value='';document.getElementById('invAmtInput').value='';showToast('Investment added!','success')}
    function renderInvestments(){const c=document.getElementById('investList');if(!c)return;const d=getFinData();const total=d.investments.reduce((s,e)=>s+Number(e.amount),0);c.innerHTML=(total?`<div style="background:#e5f9e9;border-radius:12px;padding:10px;margin-bottom:10px;text-align:center"><b style="color:#34c759">Total: ₹${total.toLocaleString('en-IN')}</b></div>`:'')+d.investments.map(e=>`<div class="expense-item"><div><b style="font-size:13px">${e.type} ${e.name}</b>${e.returnPct?`<br><span style="font-size:11px;color:#34c759">Return:${e.returnPct}%</span>`:''}</div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;color:#34c759">₹${Number(e.amount).toLocaleString('en-IN')}</span><button onclick="deleteFinEntry('investments',${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No investments.</p>'}
    function deleteFinEntry(col,id){const d=getFinData();d[col]=d[col].filter(e=>e.id!==id);saveFinData(d);renderFinanceDashboard()}
    function calculateTax(){const income=Number(document.getElementById('taxIncomeInput').value);const ded=Number(document.getElementById('taxDeductionInput').value);if(!income)return showToast('Enter income!','error');const taxable=Math.max(0,income-ded-50000);let tax=0;if(taxable>300000&&taxable<=600000)tax=(taxable-300000)*0.05;else if(taxable>600000&&taxable<=900000)tax=15000+(taxable-600000)*0.10;else if(taxable>900000&&taxable<=1200000)tax=45000+(taxable-900000)*0.15;else if(taxable>1200000&&taxable<=1500000)tax=90000+(taxable-1200000)*0.20;else if(taxable>1500000)tax=150000+(taxable-1500000)*0.30;const cess=tax*0.04;const el=document.getElementById('taxResult');if(el)el.innerHTML=`<div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-top:8px"><p style="margin:3px 0;font-size:12px">📌 Taxable: ₹${taxable.toLocaleString('en-IN')}</p><p style="margin:3px 0;font-size:12px">🧾 Tax: ₹${Math.round(tax).toLocaleString('en-IN')}</p><p style="margin:3px 0;font-size:12px">➕ Cess: ₹${Math.round(cess).toLocaleString('en-IN')}</p><p style="margin:6px 0 0;font-size:14px;font-weight:800;color:#ff3b30">💰 Total: ₹${Math.round(tax+cess).toLocaleString('en-IN')}</p><p style="margin:2px 0 0;font-size:11px;color:#8e8e93">*New Tax Regime FY2024-25</p></div>`}

    // STUDENT MODE
    function getStudentData(){return JSON.parse(localStorage.getItem('studentData')||'{"exams":[],"subjects":[]}')}
    function saveStudentData(d){localStorage.setItem('studentData',JSON.stringify(d));syncToCloud()}
    function addExam(){const name=document.getElementById('examNameInput').value.trim();const date=document.getElementById('examDateInput').value;const emoji=document.getElementById('examEmojiInput').value.trim()||'📝';if(!name||!date)return showToast('Enter exam name & date!','error');const d=getStudentData();d.exams.unshift({id:Date.now(),name,date,emoji});saveStudentData(d);renderExamCountdowns();document.getElementById('examNameInput').value='';document.getElementById('examDateInput').value='';showToast('Exam added!','success')}
    function renderExamCountdowns(){const c=document.getElementById('examCountdownsContainer');if(!c)return;const d=getStudentData();const today=new Date();today.setHours(0,0,0,0);const upcoming=d.exams.filter(e=>new Date(e.date)>=today).sort((a,b)=>new Date(a.date)-new Date(b.date));if(!upcoming.length){c.innerHTML='';return}c.innerHTML=upcoming.slice(0,3).map(e=>{const days=Math.ceil((new Date(e.date)-today)/86400000);const col=days<=7?'#ff3b30':days<=30?'#ff9500':'#34c759';return`<div class="exam-countdown-card" style="background:linear-gradient(135deg,${col},${col}aa);position:relative"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;opacity:0.8;font-weight:600;text-transform:uppercase">EXAM</div><div style="font-size:18px;font-weight:800;margin-top:2px">${e.emoji} ${e.name}</div><div style="font-size:12px;opacity:0.85;margin-top:2px">📅 ${new Date(e.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div><div style="text-align:center"><div style="font-size:36px;font-weight:900;line-height:1">${days}</div><div style="font-size:10px;opacity:0.85">${days===1?'DAY':'DAYS'} LEFT</div></div></div><button onclick="deleteExam(${e.id})" style="position:absolute;right:8px;top:8px;background:rgba(255,255,255,0.2);border:none;color:white;border-radius:6px;padding:2px 6px;cursor:pointer;font-size:11px">✖</button></div>`}).join('')}
    function deleteExam(id){const d=getStudentData();d.exams=d.exams.filter(e=>e.id!==id);saveStudentData(d);renderExamCountdowns()}
    function addSubject(){const name=document.getElementById('subjectNameInput').value.trim();const color=document.getElementById('subjectColorInput').value;if(!name)return showToast('Enter subject!','error');const d=getStudentData();d.subjects.unshift({id:Date.now(),name,color,studyHours:0});saveStudentData(d);renderSubjects();updateStudySubjectSelect();document.getElementById('subjectNameInput').value='';showToast('Subject added!','success')}
    function renderSubjects(){const c=document.getElementById('subjectsList');if(!c)return;const d=getStudentData();c.innerHTML=d.subjects.map(s=>`<div class="subject-item"><div style="display:flex;align-items:center;gap:10px"><div style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0"></div><div><b style="font-size:13px">${s.name}</b><br><span style="font-size:11px;color:#8e8e93">📚 ${s.studyHours||0}h</span></div></div><div style="display:flex;align-items:center;gap:6px"><button onclick="logStudyHour(${s.id})" style="background:${s.color}22;color:${s.color};border:none;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer;font-size:12px">+1h</button><button onclick="deleteSubject(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No subjects.</p>'}
    function logStudyHour(id){const d=getStudentData();const s=d.subjects.find(x=>x.id===id);if(s)s.studyHours=(s.studyHours||0)+1;saveStudentData(d);renderSubjects();showToast('📚 1h logged!','success')}
    function deleteSubject(id){const d=getStudentData();d.subjects=d.subjects.filter(s=>s.id!==id);saveStudentData(d);renderSubjects();updateStudySubjectSelect()}
    function updateStudySubjectSelect(){const sel=document.getElementById('studySubjectSelect');if(!sel)return;const d=getStudentData();sel.innerHTML='<option value="">Select Subject</option>'+d.subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}

    // JOURNAL
    function getJournalEntries(){return JSON.parse(localStorage.getItem('journalEntries')||'{}')}
    function saveJournalEntries(data){localStorage.setItem('journalEntries',JSON.stringify(data));syncToCloud()}
    function loadTodayJournalEntry(){const e=getJournalEntries()[getTodayStr()];const el=document.getElementById('journalEntryInput');if(el&&e)el.value=e.text||''}
    function saveJournalEntry(){const text=document.getElementById('journalEntryInput').value.trim();if(!text)return showToast('Write something!','error');const entries=getJournalEntries();const todayStr=getTodayStr();const ml=JSON.parse(localStorage.getItem('moodLog')||'{}');entries[todayStr]={text,mood:ml[todayStr],savedAt:new Date().toISOString()};saveJournalEntries(entries);renderJournalEntries();showToast('Journal saved! 📓','success')}
    function renderJournalEntries(){const c=document.getElementById('journalEntriesContainer');if(!c)return;const entries=getJournalEntries();const search=(document.getElementById('journalSearchInput')?.value||'').toLowerCase();const me=['😄','😊','😐','😔','😢'];const sorted=Object.entries(entries).sort((a,b)=>b[0].localeCompare(a[0])).filter(([_,e])=>!search||e.text.toLowerCase().includes(search));if(!sorted.length){c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No entries yet. Start writing! ✍️</p>';return}c.innerHTML=sorted.slice(0,30).map(([date,entry])=>{const ms=entry.mood!==undefined?me[entry.mood]:'';const dt=new Date(date+'T00:00:00');return`<div class="journal-entry"><div class="journal-date">${dt.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} ${ms}</div><p style="margin:0;font-size:13px;line-height:1.6;color:inherit">${entry.text.slice(0,200)}${entry.text.length>200?'...':''}</p><div style="display:flex;gap:8px;margin-top:8px"><button onclick="editJournalEntry('${date}')" style="background:#f2f2f7;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">✏️ Edit</button><button onclick="deleteJournalEntry('${date}')" style="background:#ffe5e5;color:#ff3b30;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">🗑️</button></div></div>`}).join('')}
    function editJournalEntry(date){const e=getJournalEntries();const el=document.getElementById('journalEntryInput');if(el&&e[date])el.value=e[date].text;showToast('Editing...','info')}
    function deleteJournalEntry(date){const e=getJournalEntries();delete e[date];saveJournalEntries(e);renderJournalEntries()}

    // MEDICINE
    function getMeds(){return JSON.parse(localStorage.getItem('medicines')||'[]')}
    function saveMeds(data){localStorage.setItem('medicines',JSON.stringify(data));syncToCloud()}
    function openMedicineModal(){renderMedicineList();openModal('medicineModal')}
    function addMedicine(){const name=document.getElementById('medNameInput').value.trim();const dose=document.getElementById('medDoseInput').value.trim();const time=document.getElementById('medTimeInput').value;const freq=document.getElementById('medFreqInput').value;if(!name)return showToast('Enter medicine name!','error');const meds=getMeds();meds.unshift({id:Date.now(),name,dose,time,freq,takenDate:null});saveMeds(meds);renderMedicineList();document.getElementById('medNameInput').value='';document.getElementById('medDoseInput').value='';if(time){let rems=JSON.parse(localStorage.getItem('reminders')||'[]');rems.push({id:Date.now(),task:`💊 Take ${name}`,notes:dose||'',time:`${getTodayStr()}T${time}`,priority:'high',repeat:'daily',status:'pending',notified:false,pinned:false,tags:'medicine',preAlarm:0,category:{name:'Health',icon:'💊'}});localStorage.setItem('reminders',JSON.stringify(rems));loadReminders()}showToast('💊 Medicine added!','success')}
    function renderMedicineList(){const c=document.getElementById('medicineList');if(!c)return;const meds=getMeds();const ts=getTodayStr();c.innerHTML=meds.map(m=>`<div class="med-item ${m.takenDate===ts?'med-taken':''}"><div><b style="font-size:13px">💊 ${m.name}</b><br><span style="font-size:11px;color:#8e8e93">${m.dose||''}${m.time?' · '+m.time:''}·${m.freq}</span></div><div style="display:flex;gap:8px;align-items:center"><button onclick="toggleMedTaken(${m.id})" style="background:${m.takenDate===ts?'#e5e5ea':'#e5f9e9'};color:${m.takenDate===ts?'#8e8e93':'#34c759'};border:none;border-radius:8px;padding:5px 10px;font-weight:700;cursor:pointer;font-size:12px">${m.takenDate===ts?'Taken ✅':'Take'}</button><button onclick="deleteMed(${m.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No medicines.</p>'}
    function toggleMedTaken(id){const m=getMeds();const x=m.find(x=>x.id===id);if(x)x.takenDate=(x.takenDate===getTodayStr()?null:getTodayStr());saveMeds(m);renderMedicineList()}
    function deleteMed(id){saveMeds(getMeds().filter(x=>x.id!==id));renderMedicineList()}

    // VEHICLE
    function getVehicles(){return JSON.parse(localStorage.getItem('vehicleReminders')||'[]')}
    function saveVehicles(d){localStorage.setItem('vehicleReminders',JSON.stringify(d));syncToCloud()}
    function openVehicleModal(){renderVehicleList();openModal('vehicleModal')}
    function addVehicleReminder(){const veh=document.getElementById('vehNameInput').value.trim();const reminder=document.getElementById('vehReminderInput').value.trim();const due=document.getElementById('vehDueInput').value;const type=document.getElementById('vehTypeInput').value;if(!veh||!due)return showToast('Enter vehicle & due date!','error');const data=getVehicles();data.unshift({id:Date.now(),veh,reminder,due,type});saveVehicles(data);let rems=JSON.parse(localStorage.getItem('reminders')||'[]');rems.push({id:Date.now(),task:`🚗 ${veh}: ${reminder||type}`,notes:'',time:`${due}T09:00`,priority:'high',repeat:'none',status:'pending',notified:false,pinned:false,tags:'vehicle',preAlarm:0,category:{name:'Vehicle',icon:'🚗'}});localStorage.setItem('reminders',JSON.stringify(rems));loadReminders();document.getElementById('vehNameInput').value='';document.getElementById('vehReminderInput').value='';renderVehicleList();showToast('Vehicle reminder added!','success')}
    function renderVehicleList(){const c=document.getElementById('vehicleReminderList');if(!c)return;const data=getVehicles();const today=getTodayStr();c.innerHTML=data.map(v=>{const dl=Math.ceil((new Date(v.due)-new Date(today))/86400000);const col=dl<0?'#ff3b30':dl<=7?'#ff9500':'#34c759';return`<div class="vehicle-item" style="border-left:3px solid ${col}"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><b style="font-size:13px">${v.type} ${v.veh}</b>${v.reminder?`<br><span style="font-size:12px;color:var(--primary)">${v.reminder}</span>`:''}<br><span style="font-size:11px;color:#8e8e93">📅 ${v.due}·${dl<0?'⚠️Overdue':dl===0?'🔴Today!':dl+'d'}</span></div><button onclick="deleteVehicle(${v.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No vehicle reminders.</p>'}
    function deleteVehicle(id){saveVehicles(getVehicles().filter(x=>x.id!==id));renderVehicleList()}

    // SHOPPING
    function getShopData(){return JSON.parse(localStorage.getItem('shopData')||'{"lists":{},"activeList":""}')}
    function saveShopData(d){localStorage.setItem('shopData',JSON.stringify(d));syncToCloud()}
    function openShoppingModal(){renderShopListSelect();renderShoppingItems();openModal('shoppingModal')}
    function addShopList(){const name=document.getElementById('shopNameInput').value.trim();if(!name)return showToast('Enter list name!','error');const d=getShopData();if(!d.lists[name])d.lists[name]=[];d.activeList=name;saveShopData(d);document.getElementById('shopNameInput').value='';renderShopListSelect();renderShoppingItems()}
    function renderShopListSelect(){const sel=document.getElementById('shopListSelect');if(!sel)return;const d=getShopData();sel.innerHTML=Object.keys(d.lists).map(l=>`<option value="${l}" ${l===d.activeList?'selected':''}>${l} (${d.lists[l].length})</option>`).join('')}
    function addShopItem(){const d=getShopData();const list=document.getElementById('shopListSelect')?.value||d.activeList;if(!list)return showToast('Create a list first!','error');const name=document.getElementById('shopItemInput').value.trim();const qty=document.getElementById('shopQtyInput').value||1;if(!name)return showToast('Enter item!','error');if(!d.lists[list])d.lists[list]=[];d.lists[list].unshift({id:Date.now(),name,qty:Number(qty),done:false});saveShopData(d);document.getElementById('shopItemInput').value='';document.getElementById('shopQtyInput').value='';renderShoppingItems()}
    function renderShoppingItems(){const c=document.getElementById('shoppingItems');const te=document.getElementById('shoppingTotal');if(!c)return;const d=getShopData();const ln=document.getElementById('shopListSelect')?.value||d.activeList;if(!ln||!d.lists[ln]){c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">Select/create a list.</p>';return}const items=d.lists[ln];const done=items.filter(i=>i.done).length;if(te)te.innerText=`${done}/${items.length} items`;c.innerHTML=items.map(i=>`<div class="shop-item ${i.done?'done':''}"><input type="checkbox" ${i.done?'checked':''} onchange="toggleShopItem('${ln}',${i.id})" style="width:18px;height:18px;margin:0;flex-shrink:0"><span style="flex:1;font-size:13px">${i.name}</span><span style="font-size:11px;color:#8e8e93">×${i.qty}</span><button onclick="deleteShopItem('${ln}',${i.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">Empty list.</p>'}
    function toggleShopItem(list,id){const d=getShopData();const item=d.lists[list]?.find(x=>x.id===id);if(item)item.done=!item.done;saveShopData(d);renderShoppingItems()}
    function deleteShopItem(list,id){const d=getShopData();if(d.lists[list])d.lists[list]=d.lists[list].filter(x=>x.id!==id);saveShopData(d);renderShoppingItems()}

    // TRAVEL
    function getTravelData(){return JSON.parse(localStorage.getItem('travelData')||'{"trips":[],"packing":[]}')}
    function saveTravelData(d){localStorage.setItem('travelData',JSON.stringify(d));syncToCloud()}
    function openTravelModal(){setTravelTab('trips');renderTrips();openModal('travelModal')}
    function setTravelTab(tab){document.querySelectorAll('[id^="traveltab-"]').forEach(b=>b.classList.remove('active'));document.getElementById('traveltab-'+tab).classList.add('active');document.getElementById('travelTabTrips').style.display=tab==='trips'?'block':'none';document.getElementById('travelTabPacking').style.display=tab==='packing'?'block':'none';if(tab==='packing')renderPackingList()}
    function addTrip(){const name=document.getElementById('tripNameInput').value.trim();const dest=document.getElementById('tripDestInput').value.trim();const from=document.getElementById('tripFromInput').value;const to=document.getElementById('tripToInput').value;if(!name)return showToast('Enter trip name!','error');const d=getTravelData();d.trips.unshift({id:Date.now(),name,dest,from,to});saveTravelData(d);renderTrips();document.getElementById('tripNameInput').value='';document.getElementById('tripDestInput').value='';showToast('Trip added! ✈️','success')}
    function renderTrips(){const c=document.getElementById('tripsList');if(!c)return;const d=getTravelData();c.innerHTML=d.trips.map(t=>{const days=t.from&&t.to?Math.ceil((new Date(t.to)-new Date(t.from))/86400000)+1:null;return`<div class="trip-item"><div><b style="font-size:13px">✈️ ${t.name}</b>${t.dest?`<br><span style="font-size:11px;color:var(--primary)">📍${t.dest}</span>`:''}${t.from?`<br><span style="font-size:11px;color:#8e8e93">${t.from}→${t.to||'?'}${days?` (${days}d)`:''}</span>`:''}</div><button onclick="deleteTrip(${t.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No trips.</p>'}
    function deleteTrip(id){const d=getTravelData();d.trips=d.trips.filter(x=>x.id!==id);saveTravelData(d);renderTrips()}
    function addPackingItem(){const name=document.getElementById('packItemInput').value.trim();const cat=document.getElementById('packCatInput').value;if(!name)return showToast('Enter item!','error');const d=getTravelData();d.packing.unshift({id:Date.now(),name,cat,packed:false});saveTravelData(d);renderPackingList();document.getElementById('packItemInput').value=''}
    function renderPackingList(){const c=document.getElementById('packingList');if(!c)return;const d=getTravelData();const done=d.packing.filter(x=>x.packed).length;c.innerHTML=`<p style="font-size:12px;color:#8e8e93;margin:0 0 10px">✅ ${done}/${d.packing.length} packed</p>`+d.packing.map(item=>`<div class="packing-item"><input type="checkbox" ${item.packed?'checked':''} onchange="togglePackItem(${item.id})" style="width:18px;height:18px;margin:0;flex-shrink:0"><span style="flex:1;font-size:13px;${item.packed?'text-decoration:line-through;opacity:0.5':''}">${item.name}</span><span style="font-size:10px;color:#8e8e93">${item.cat.split(' ')[0]}</span><button onclick="deletePackItem(${item.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:14px">✖</button></div>`).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">Empty.</p>'}
    function togglePackItem(id){const d=getTravelData();const i=d.packing.find(x=>x.id===id);if(i)i.packed=!i.packed;saveTravelData(d);renderPackingList()}
    function deletePackItem(id){const d=getTravelData();d.packing=d.packing.filter(x=>x.id!==id);saveTravelData(d);renderPackingList()}

    // ATTENDANCE
    function getAttData(){return JSON.parse(localStorage.getItem('attData')||'{"subjects":[]}')}
    function saveAttData(d){localStorage.setItem('attData',JSON.stringify(d));syncToCloud()}
    function openAttendanceModal(){renderAttSubjectList();openModal('attendanceModal')}
    function addAttSubject(){const name=document.getElementById('attSubjectInput').value.trim();if(!name)return showToast('Enter subject!','error');const d=getAttData();d.subjects.unshift({id:Date.now(),name,log:{}});saveAttData(d);renderAttSubjectList();document.getElementById('attSubjectInput').value='';showToast('Subject added!','success')}
    function renderAttSubjectList(){const c=document.getElementById('attSubjectList');if(!c)return;const d=getAttData();const ts=getTodayStr();c.innerHTML=d.subjects.map(s=>{const total=Object.keys(s.log).filter(k=>s.log[k]).length;const present=Object.values(s.log).filter(v=>v==='P').length;const pct=total>0?Math.round((present/total)*100):0;const tv=s.log[ts]||'';return`<div style="background:#f2f2f7;border-radius:14px;padding:12px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><b style="font-size:14px">${s.name}</b><br><span style="font-size:11px;color:${pct>=75?'#34c759':'#ff3b30'};font-weight:700">${pct}% (${present}/${total})</span></div><button onclick="deleteAttSubject(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px"><button onclick="markAtt(${s.id},'${ts}','P')" class="att-day ${tv==='P'?'att-present':'att-unmarked'}">✅ P</button><button onclick="markAtt(${s.id},'${ts}','A')" class="att-day ${tv==='A'?'att-absent':'att-unmarked'}">❌ A</button><button onclick="markAtt(${s.id},'${ts}','H')" class="att-day ${tv==='H'?'att-holiday':'att-unmarked'}">🏖️ H</button></div><div class="project-progress-track"><div class="project-progress-fill" style="width:${pct}%;background:${pct>=75?'#34c759':'#ff3b30'}"></div></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No subjects.</p>'}
    function markAtt(subId,dateStr,status){const d=getAttData();const s=d.subjects.find(x=>x.id===subId);if(s)s.log[dateStr]=(s.log[dateStr]===status?'':status);saveAttData(d);renderAttSubjectList()}
    function deleteAttSubject(id){const d=getAttData();d.subjects=d.subjects.filter(x=>x.id!==id);saveAttData(d);renderAttSubjectList()}

    // LIFE EVENTS
    function getLifeEvents(){return JSON.parse(localStorage.getItem('lifeEvents')||'[]')}
    function saveLifeEvents(d){localStorage.setItem('lifeEvents',JSON.stringify(d));syncToCloud()}
    function openLifeEventsModal(){renderLifeEvents();openModal('lifeEventsModal')}
    function addLifeEvent(){const name=document.getElementById('lifeEventNameInput').value.trim();const date=document.getElementById('lifeEventDateInput').value;const emoji=document.getElementById('lifeEventEmojiInput').value.trim()||'⭐';const color=document.getElementById('lifeEventColorInput').value;if(!name||!date)return showToast('Enter name & date!','error');const events=getLifeEvents();events.push({id:Date.now(),name,date,emoji,color});events.sort((a,b)=>b.date.localeCompare(a.date));saveLifeEvents(events);document.getElementById('lifeEventNameInput').value='';document.getElementById('lifeEventEmojiInput').value='';renderLifeEvents();showToast('Life event added! 🌟','success')}
    function renderLifeEvents(){const c=document.getElementById('lifeEventsContainer');if(!c)return;const events=getLifeEvents();if(!events.length){c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:20px">No events yet. Add your milestones! 🌟</p>';return}c.innerHTML=events.map(e=>{const dt=new Date(e.date+'T00:00:00');const da=Math.floor((new Date()-dt)/86400000);const label=da===0?'Today!':da>0?`${da} days ago`:`in ${Math.abs(da)} days`;return`<div class="life-event-item"><div class="life-event-dot" style="background:${e.color}"></div><div style="flex:1"><div style="font-size:15px;font-weight:700">${e.emoji} ${e.name}</div><div style="font-size:11px;color:#8e8e93;margin-top:2px">📅 ${dt.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}·${label}</div></div><button onclick="deleteLifeEvent(${e.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div>`}).join('')}
    function deleteLifeEvent(id){saveLifeEvents(getLifeEvents().filter(x=>x.id!==id));renderLifeEvents()}

    // SUBSCRIPTIONS
    function getSubs(){return JSON.parse(localStorage.getItem('subscriptions')||'[]')}
    function saveSubs(d){localStorage.setItem('subscriptions',JSON.stringify(d));syncToCloud()}
    function openSubModal(){renderSubSummary();renderSubList();openModal('subModal')}
    function addSubscription(){const name=document.getElementById('subNameInput').value.trim();const amt=Number(document.getElementById('subAmtInput').value);const renew=document.getElementById('subRenewInput').value;const freq=document.getElementById('subFreqInput').value;if(!name||!amt)return showToast('Enter name & amount!','error');const subs=getSubs();subs.unshift({id:Date.now(),name,amount:amt,renew,freq});saveSubs(subs);renderSubSummary();renderSubList();document.getElementById('subNameInput').value='';document.getElementById('subAmtInput').value='';showToast('Subscription added!','success')}
    function renderSubSummary(){const el=document.getElementById('subSummary');if(!el)return;const subs=getSubs();const m=subs.reduce((s,x)=>s+(x.freq==='yearly'?x.amount/12:x.freq==='weekly'?x.amount*4.33:x.amount),0);el.innerHTML=`<p style="margin:0;font-size:13px;font-weight:700">Monthly:<span style="color:var(--primary)"> ₹${m.toFixed(0)}</span> &nbsp; Yearly:<span style="color:#ff3b30"> ₹${(m*12).toFixed(0)}</span></p>`}
    function renderSubList(){const c=document.getElementById('subList');if(!c)return;const subs=getSubs();const today=getTodayStr();c.innerHTML=subs.map(s=>{const dl=s.renew?Math.ceil((new Date(s.renew)-new Date(today))/86400000):null;const col=dl!==null&&dl<=3?'#ff3b30':dl!==null&&dl<=7?'#ff9500':'#8e8e93';return`<div class="sub-item"><div><b style="font-size:13px">${s.name}</b><br><span style="font-size:11px;color:${col}">${s.renew?`Renews:${s.renew}${dl!==null?` · ${dl<0?'⚠️Overdue':dl+'d'}`:''}`:'No date'}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-weight:700;font-size:13px">₹${s.amount}/${s.freq==='monthly'?'mo':s.freq==='yearly'?'yr':'wk'}</span><button onclick="deleteSub(${s.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button></div></div>`}).join('')||'<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No subscriptions.</p>'}
    function deleteSub(id){saveSubs(getSubs().filter(x=>x.id!==id));renderSubSummary();renderSubList()}

    // SECRET SPACE
    function openSecretModal(){document.getElementById('secretLockScreen').style.display='block';document.getElementById('secretUnlocked').style.display='none';document.getElementById('secretPinInput').value='';openModal('secretModal')}
    function unlockSecret(){const entered=document.getElementById('secretPinInput').value;const stored=localStorage.getItem('secretPin');if(!stored){showToast('Set a PIN first!','error');return}if(entered===stored){document.getElementById('secretLockScreen').style.display='none';document.getElementById('secretUnlocked').style.display='block';document.getElementById('secretNoteInput').value=localStorage.getItem('secretNote')||''}else{showToast('Wrong PIN! 🔐','error');document.getElementById('secretPinInput').value=''}}
    function setupSecretPin(){const pin=prompt('Enter a new 4-digit PIN:');if(pin&&/^\d{4}$/.test(pin)){localStorage.setItem('secretPin',pin);showToast('PIN set! 🔐','success')}else if(pin)showToast('Use 4 digits!','error')}
    function saveSecretNote(){localStorage.setItem('secretNote',document.getElementById('secretNoteInput').value);showToast('Saved 🔒','success');lockSecret()}
    function lockSecret(){document.getElementById('secretLockScreen').style.display='block';document.getElementById('secretUnlocked').style.display='none';document.getElementById('secretNoteInput').value='';document.getElementById('secretPinInput').value=''}

    // WEATHER
    function openWeatherModal(){document.getElementById('weatherApiKeyInput').value=localStorage.getItem('weatherApiKey')||'';document.getElementById('weatherCityInput').value=localStorage.getItem('weatherCity')||'';openModal('weatherModal')}
    function saveWeatherKey(){localStorage.setItem('weatherApiKey',document.getElementById('weatherApiKeyInput').value.trim());showToast('API Key saved! 🌤️','success')}
    async function fetchWeather(){const city=document.getElementById('weatherCityInput').value.trim();const apiKey=document.getElementById('weatherApiKeyInput').value.trim()||localStorage.getItem('weatherApiKey');if(!city)return showToast('Enter city!','error');if(!apiKey)return showToast('Add free API Key from openweathermap.org!','error');localStorage.setItem('weatherCity',city);const re=document.getElementById('weatherResult');re.innerHTML='<p style="color:#8e8e93;font-size:13px">Loading... ⏳</p>';try{const res=await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);const data=await res.json();if(data.cod!==200){re.innerHTML=`<p style="color:#ff3b30;font-size:13px">⚠️ ${data.message}</p>`;return}re.innerHTML=`<div class="weather-widget" style="text-align:left"><div style="display:flex;align-items:center;gap:12px"><img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" style="width:60px;height:60px"><div><div style="font-size:22px;font-weight:800">${Math.round(data.main.temp)}°C</div><div style="font-size:14px;opacity:0.9">${data.weather[0].description}</div><div style="font-size:12px;opacity:0.8">📍 ${data.name},${data.sys.country}</div></div></div><div style="display:flex;gap:15px;margin-top:12px;font-size:12px;opacity:0.9"><span>💧${data.main.humidity}%</span><span>🌬️${Math.round(data.wind.speed)}m/s</span><span>🌡️Feels ${Math.round(data.main.feels_like)}°C</span></div></div>`}catch(e){re.innerHTML='<p style="color:#ff3b30;font-size:13px">⚠️ Error. Check internet.</p>'}}


    // ============================================================
    // BACKUP & RESTORE
    // ============================================================
    function exportAllData() {
        const keys = ['reminders','habits','finData','moodLog','sleepLog','projects','shiftConfig','studentData','journalEntries','medicines','vehicleReminders','shopData','travelData','attData','lifeEvents','subscriptions','birthdays','homeManagement','quickNotes','pomodoroHistory','appTheme','appFontSize','darkMode','geminiKey','pushNotif','webhookUrl','gcalClientId','activeWorkspace'];
        const backup = { version:'2.0', exportedAt:new Date().toISOString() };
        keys.forEach(k => { const v = localStorage.getItem(k); if(v) backup[k] = v; });
        const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `MasterApp_Backup_${getTodayStr()}.json`; a.click();
        URL.revokeObjectURL(url);
        hapticFeedback('success'); showToast('📦 Backup exported!', 'success');
    }

    function restoreAllData(event) {
        const file = event.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const backup = JSON.parse(e.target.result);
                if(!backup.version) return showToast('Invalid backup file!', 'error');
                const skip = ['version','exportedAt'];
                Object.entries(backup).forEach(([k,v]) => { if(!skip.includes(k)) localStorage.setItem(k, v); });
                showToast('✅ Restore successful! Reloading...', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch(err) { showToast('Error reading backup!', 'error'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // ============================================================
    // HAPTIC FEEDBACK
    // ============================================================
    function hapticFeedback(type='light') {
        if(!navigator.vibrate || localStorage.getItem('haptic') !== 'true') return;
        const patterns = { light:[20], medium:[40], success:[20,50,20], error:[100,50,100] };
        navigator.vibrate(patterns[type] || [20]);
    }

    // ============================================================
    // PWA INSTALL
    // ============================================================
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault(); deferredPrompt = e;
        setTimeout(() => { const b = document.getElementById('pwaBanner'); if(b) b.style.display='flex'; }, 3000);
    });
    function installPWA() {
        document.getElementById('pwaBanner').style.display='none';
        if(deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; }); }
    }

    // ============================================================
    // DARK AUTO SCHEDULE
    // ============================================================
    function saveAutoDarkSettings() {
        const enabled = document.getElementById('autoDarkToggle').checked;
        const from = document.getElementById('autoDarkFrom').value;
        const to = document.getElementById('autoDarkTo').value;
        localStorage.setItem('autoDark', JSON.stringify({enabled,from,to}));
        document.getElementById('autoDarkTimesWrap').style.display = enabled ? 'block' : 'none';
        checkAutoDark();
        showToast(enabled ? '🌙 Auto dark mode ON' : 'Auto dark OFF', 'info');
    }

    function checkAutoDark() {
        const cfg = JSON.parse(localStorage.getItem('autoDark') || 'null');
        if(!cfg || !cfg.enabled) return;
        const now = new Date();
        const cur = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const isDark = (cfg.from < cfg.to) ? (cur >= cfg.from && cur < cfg.to) : (cur >= cfg.from || cur < cfg.to);
        const body = document.body;
        const toggle = document.getElementById('darkModeToggle');
        if(isDark && !body.classList.contains('dark-mode')) { body.classList.add('dark-mode'); if(toggle) toggle.checked=true; localStorage.setItem('darkMode','true'); }
        else if(!isDark && body.classList.contains('dark-mode')) { body.classList.remove('dark-mode'); if(toggle) toggle.checked=false; localStorage.setItem('darkMode','false'); }
    }
    setInterval(checkAutoDark, 60000);

    // ============================================================
    // WIDGET CUSTOMIZATION
    // ============================================================
    function toggleWidget(name, show) {
        const map = { mood:'todayMoodSection', sleep:'todaySleepSection', shift:'todayShiftCard', aitip:'aiTipContainer' };
        const el = document.getElementById(map[name]);
        if(el) el.style.display = show ? '' : 'none';
        const prefs = JSON.parse(localStorage.getItem('widgetPrefs') || '{}');
        prefs[name] = show; localStorage.setItem('widgetPrefs', JSON.stringify(prefs));
        syncToCloud();
    }

    function applyWidgetPrefs() {
        const prefs = JSON.parse(localStorage.getItem('widgetPrefs') || '{"mood":true,"sleep":true,"shift":true,"aitip":true}');
        Object.entries(prefs).forEach(([k,v]) => {
            toggleWidget(k, v);
            const chk = document.getElementById('w-'+k);
            if(chk) chk.checked = v;
        });
    }

    // ============================================================
    // BIRTHDAY TRACKER
    // ============================================================
    function getBirthdays() { return JSON.parse(localStorage.getItem('birthdays') || '[]'); }
    function saveBirthdays(d) { localStorage.setItem('birthdays', JSON.stringify(d)); syncToCloud(); }
    function openBirthdayModal() { renderBirthdayList(); openModal('birthdayModal'); }

    function addBirthday() {
        const name = document.getElementById('bdayNameInput').value.trim();
        const date = document.getElementById('bdayDateInput').value;
        const rel = document.getElementById('bdayRelInput').value;
        const emoji = document.getElementById('bdayEmojiInput').value.trim() || '🎂';
        if(!name || !date) return showToast('Enter name & birthday!', 'error');
        const bdays = getBirthdays();
        bdays.push({id:Date.now(), name, date, rel, emoji});
        saveBirthdays(bdays);
        document.getElementById('bdayNameInput').value = '';
        document.getElementById('bdayEmojiInput').value = '';
        renderBirthdayList();
        createBirthdayReminders();
        hapticFeedback('success');
        showToast('🎂 Birthday added!', 'success');
    }

    function renderBirthdayList() {
        const c = document.getElementById('birthdayList'); if(!c) return;
        const bdays = getBirthdays();
        const now = new Date(); const thisYear = now.getFullYear();
        const sorted = bdays.map(b => {
            const [_,mm,dd] = b.date.split('-');
            const next = new Date(`${thisYear}-${mm}-${dd}`);
            if(next < now) next.setFullYear(thisYear+1);
            const days = Math.ceil((next - now) / 86400000);
            return {...b, days, next};
        }).sort((a,b) => a.days - b.days);
        c.innerHTML = sorted.map(b => {
            const isSoon = b.days <= 7;
            return `<div class="bday-item ${isSoon ? 'bday-soon' : ''}">
                <div><b style="font-size:13px">${b.emoji} ${b.name}</b><br>
                    <span style="font-size:11px;color:#8e8e93">${b.rel} · 📅 ${b.date.slice(5)} · ${b.days===0?'🎉 Today!':b.days===1?'Tomorrow!':b.days+' days'}</span>
                </div>
                <button onclick="deleteBirthday(${b.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px">✖</button>
            </div>`;
        }).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No birthdays added.</p>';
    }

    function deleteBirthday(id) { saveBirthdays(getBirthdays().filter(x=>x.id!==id)); renderBirthdayList(); }

    function createBirthdayReminders() {
        const bdays = getBirthdays();
        const now = new Date(); const thisYear = now.getFullYear();
        let reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        reminders = reminders.filter(r => r.tags !== 'birthday');
        bdays.forEach(b => {
            const [_,mm,dd] = b.date.split('-');
            let next = new Date(`${thisYear}-${mm}-${dd}T09:00`);
            if(next < now) next = new Date(`${thisYear+1}-${mm}-${dd}T09:00`);
            const pad = n => String(n).padStart(2,'0');
            const timeStr = `${next.getFullYear()}-${pad(next.getMonth()+1)}-${pad(next.getDate())}T09:00`;
            reminders.push({id:Date.now()+Math.random(), task:`🎂 ${b.name}'s Birthday!`, notes:`${b.rel} birthday`, time:timeStr, priority:'high', repeat:'yearly', status:'pending', notified:false, pinned:false, tags:'birthday', preAlarm:1440, category:{name:'Birthday',icon:'🎂'}});
        });
        localStorage.setItem('reminders', JSON.stringify(reminders));
        loadReminders(); syncToCloud();
    }

    // ============================================================
    // HOME MANAGEMENT
    // ============================================================
    function getChores() { return JSON.parse(localStorage.getItem('homeManagement') || '[]'); }
    function saveChores(d) { localStorage.setItem('homeManagement', JSON.stringify(d)); syncToCloud(); }
    function openHomeManagementModal() { renderChoreList('all'); openModal('homeManagementModal'); }

    function addChore() {
        const name = document.getElementById('choreNameInput').value.trim();
        const freq = document.getElementById('choreFreqInput').value;
        const area = document.getElementById('choreAreaInput').value;
        if(!name) return showToast('Enter task name!', 'error');
        const chores = getChores();
        chores.unshift({id:Date.now(), name, freq, area, done:false, lastDone:null});
        saveChores(chores); renderChoreList(currentChoreFilter || 'all');
        document.getElementById('choreNameInput').value = '';
        hapticFeedback('success'); showToast('Chore added! 🏠', 'success');
    }

    let currentChoreFilter = 'all';
    function filterChores(filter) {
        currentChoreFilter = filter;
        document.querySelectorAll('[id^="choreTab-"]').forEach(b => b.classList.remove('active'));
        document.getElementById('choreTab-'+filter).classList.add('active');
        renderChoreList(filter);
    }

    function renderChoreList(filter) {
        const c = document.getElementById('choreList'); if(!c) return;
        const chores = getChores();
        const freqColors = {daily:'#34c759', weekly:'#007aff', monthly:'#ff9500', once:'#5e5ce6'};
        const filtered = filter === 'all' ? chores : chores.filter(ch => ch.freq === filter);
        c.innerHTML = filtered.map(ch => `
            <div class="chore-item ${ch.done ? 'done' : ''}">
                <input type="checkbox" ${ch.done?'checked':''} onchange="toggleChore(${ch.id})" style="width:18px;height:18px;margin:0;flex-shrink:0;">
                <div style="flex:1;">
                    <span>${ch.area.split(' ')[0]} <b>${ch.name}</b></span>
                    ${ch.lastDone?`<br><span style="font-size:10px;color:#8e8e93">Last: ${ch.lastDone}</span>`:''}
                </div>
                <span class="chore-freq-badge" style="background:${freqColors[ch.freq]}">${ch.freq}</span>
                <button onclick="deleteChore(${ch.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:14px;">✖</button>
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No tasks in this category.</p>';
    }

    function toggleChore(id) {
        const chores = getChores(); const ch = chores.find(x => x.id === id);
        if(ch) { ch.done = !ch.done; ch.lastDone = ch.done ? getTodayStr() : ch.lastDone; }
        saveChores(chores); renderChoreList(currentChoreFilter || 'all');
        hapticFeedback('light');
    }

    function deleteChore(id) { saveChores(getChores().filter(x=>x.id!==id)); renderChoreList(currentChoreFilter||'all'); }

    // ============================================================
    // QUICK NOTES
    // ============================================================
    function getQuickNotes() { return JSON.parse(localStorage.getItem('quickNotes') || '[]'); }
    function saveQuickNotes(d) { localStorage.setItem('quickNotes', JSON.stringify(d)); syncToCloud(); }
    function openQuickNotesModal() { renderQuickNotes(); openModal('quickNotesModal'); }

    function addQuickNote() {
        const text = document.getElementById('quickNoteInput').value.trim();
        const color = document.getElementById('quickNoteColor').value;
        if(!text) return showToast('Type a note!', 'error');
        const notes = getQuickNotes();
        notes.unshift({id:Date.now(), text, color, pinned:false, created:new Date().toISOString()});
        saveQuickNotes(notes); renderQuickNotes();
        document.getElementById('quickNoteInput').value = '';
        hapticFeedback('success');
    }

    function renderQuickNotes() {
        const c = document.getElementById('quickNotesList'); if(!c) return;
        const search = (document.getElementById('noteSearchInput')?.value || '').toLowerCase();
        const notes = getQuickNotes().filter(n => !search || n.text.toLowerCase().includes(search));
        if(!notes.length) { c.innerHTML='<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No notes yet. Add one! 📝</p>'; return; }
        c.innerHTML = notes.map(n => `
            <div class="qnote-card ${n.pinned?'qnote-pinned':''}" style="background:${n.color||'#fffde7'};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <p style="margin:0;font-size:13px;line-height:1.5;flex:1;">${n.text}</p>
                    <div style="display:flex;gap:4px;margin-left:8px;flex-shrink:0;">
                        <button onclick="pinNote(${n.id})" style="background:none;border:none;cursor:pointer;font-size:15px;">${n.pinned?'📌':'📍'}</button>
                        <button onclick="deleteNote(${n.id})" style="background:none;border:none;color:#ff3b30;cursor:pointer;font-size:15px;">✖</button>
                    </div>
                </div>
                <p style="margin:6px 0 0;font-size:10px;color:#8e8e93;">${new Date(n.created).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
            </div>`).join('');
    }

    function pinNote(id) { const n=getQuickNotes(); const x=n.find(x=>x.id===id); if(x) x.pinned=!x.pinned; n.sort((a,b)=>b.pinned-a.pinned); saveQuickNotes(n); renderQuickNotes(); }
    function deleteNote(id) { saveQuickNotes(getQuickNotes().filter(x=>x.id!==id)); renderQuickNotes(); }

    // ============================================================
    // POMODORO HISTORY
    // ============================================================
    function getPomoHistory() { return JSON.parse(localStorage.getItem('pomodoroHistory') || '[]'); }
    function logPomoSession(taskName, mins) {
        const hist = getPomoHistory();
        hist.unshift({id:Date.now(), task:taskName||'Focus Session', mins, date:getTodayStr(), time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})});
        localStorage.setItem('pomodoroHistory', JSON.stringify(hist.slice(0,100)));
        syncToCloud();
    }

    function openPomoHistoryModal() { renderPomoHistory(); openModal('pomoHistoryModal'); }

    function renderPomoHistory() {
        const hist = getPomoHistory();
        const sumEl = document.getElementById('pomoHistSummary');
        const listEl = document.getElementById('pomoHistList');
        if(!sumEl || !listEl) return;
        const totalSessions = hist.length;
        const totalMins = hist.reduce((s,h)=>s+h.mins,0);
        const todaySessions = hist.filter(h=>h.date===getTodayStr()).length;
        sumEl.innerHTML = `
            <div style="background:#e5f1ff;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:var(--primary)">${totalSessions}</div><div style="font-size:11px;color:#8e8e93;font-weight:600">Total Sessions</div></div>
            <div style="background:#e5f9e9;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#34c759">${Math.round(totalMins/60)}h</div><div style="font-size:11px;color:#8e8e93;font-weight:600">Total Focus</div></div>
            <div style="background:#fff8e8;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:22px;font-weight:800;color:#ff9500">${todaySessions}</div><div style="font-size:11px;color:#8e8e93;font-weight:600">Today</div></div>`;
        listEl.innerHTML = hist.slice(0,30).map(h=>`
            <div class="pomo-hist-item">
                <div><b>${h.task}</b><br><span style="color:#8e8e93">${h.date} · ${h.time}</span></div>
                <span style="font-weight:700;color:#ff3b30">${h.mins}m 🍅</span>
            </div>`).join('') || '<p style="text-align:center;color:#8e8e93;font-size:13px;padding:15px">No sessions yet. Start a Pomodoro!</p>';
    }

    // ============================================================
    // QR CODE SHARE
    // ============================================================
    let qrInstance = null;
    function openQRModal() {
        const sel = document.getElementById('qrTaskSelect');
        const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        const active = reminders.filter(r=>r.status!=='completed'&&!r.archived).slice(0,30);
        sel.innerHTML = '<option value="">-- Select Task to Share --</option>' + active.map(r=>`<option value="${r.id}">${r.task}</option>`).join('');
        openModal('qrModal');
    }

    function generateQR() {
        const sel = document.getElementById('qrTaskSelect');
        const id = Number(sel.value);
        const display = document.getElementById('qrCodeDisplay');
        const textEl = document.getElementById('qrTaskText');
        if(!id) { display.innerHTML=''; if(textEl) textEl.innerText=''; return; }
        const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        const task = reminders.find(r=>r.id===id);
        if(!task) return;
        const payload = JSON.stringify({task:task.task, time:task.time, priority:task.priority, notes:(task.notes||'').replace(/<[^>]*>/g,'').slice(0,100)});
        display.innerHTML = '';
        try {
            qrInstance = new QRCode(display, {text:payload, width:200, height:200, colorDark:'#1c1c1e', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M});
            if(textEl) textEl.innerText = task.task + (task.time ? ' · ' + new Date(task.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '');
        } catch(e) { display.innerHTML='<p style="color:#ff3b30">QR library not loaded. Check internet.</p>'; }
    }

    function downloadQR() {
        const canvas = document.querySelector('#qrCodeDisplay canvas');
        if(!canvas) return showToast('Generate QR first!', 'error');
        const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'task-qr.png'; a.click();
        showToast('QR downloaded! 📱', 'success');
    }

    // ============================================================
    // FINANCE CHARTS
    // ============================================================
    let expPieChart = null, incExpChart = null;
    function openFinanceChartsModal() {
        openModal('financeChartsModal');
        setTimeout(renderFinanceCharts, 200);
    }

    function renderFinanceCharts() {
        const d = getFinData();
        const catTotals = {};
        d.expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category]||0) + Number(e.amount); });
        const pieCtx = document.getElementById('expensePieChart')?.getContext('2d');
        if(pieCtx) {
            if(expPieChart) expPieChart.destroy();
            const cats = Object.keys(catTotals);
            const colors = ['#ff3b30','#ff9500','#ffcc00','#34c759','#5ac8fa','#007aff','#5e5ce6','#af52de','#ff2d55'];
            expPieChart = new Chart(pieCtx, { type:'doughnut', data:{labels:cats, datasets:[{data:cats.map(c=>catTotals[c]), backgroundColor:colors.slice(0,cats.length), borderWidth:0}]}, options:{plugins:{legend:{position:'right',labels:{font:{size:11}}}},cutout:'60%'} });
        }
        const now = new Date();
        const months = []; const incData = []; const expData = [];
        for(let i=5;i>=0;i--) {
            const d2 = new Date(now.getFullYear(), now.getMonth()-i, 1);
            const ms = `${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,'0')}`;
            months.push(ms.slice(5));
            incData.push(d.income.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0));
            expData.push(d.expenses.filter(e=>e.date?.startsWith(ms)).reduce((s,e)=>s+Number(e.amount),0));
        }
        const barCtx = document.getElementById('incomeExpenseChart')?.getContext('2d');
        if(barCtx) {
            if(incExpChart) incExpChart.destroy();
            incExpChart = new Chart(barCtx, { type:'bar', data:{labels:months, datasets:[{label:'Income',data:incData,backgroundColor:'#34c759',borderRadius:6},{label:'Expense',data:expData,backgroundColor:'#ff3b30',borderRadius:6}]}, options:{scales:{y:{beginAtZero:true}},plugins:{legend:{labels:{font:{size:11}}}}} });
        }
        const el = document.getElementById('finInsightsAI');
        if(el) {
            const total = d.expenses.reduce((s,e)=>s+Number(e.amount),0);
            const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
            el.innerHTML = `<b>💡 Quick Insights</b><br>Total expenses: ₹${total.toLocaleString('en-IN')}<br>${topCat?`Top category: ${topCat[0]} (₹${topCat[1].toLocaleString('en-IN')})`:''}`;
        }
    }

    // ============================================================
    // AI COACH
    // ============================================================
    async function openAICoachModal() {
        openModal('aiCoachModal');
        await getAICoachReport('productivity');
    }

    async function getAICoachReport(type) {
        const el = document.getElementById('aiCoachDetail');
        if(el) el.innerHTML = '<p style="text-align:center;color:#8e8e93">🤔 Analyzing your data...</p>';
        try {
            const reminders = JSON.parse(localStorage.getItem('reminders')||'[]');
            const habits = JSON.parse(localStorage.getItem('habits')||'[]');
            const finData = getFinData();
            const moodLog = JSON.parse(localStorage.getItem('moodLog')||'{}');
            const totalTasks = reminders.length;
            const completedTasks = reminders.filter(r=>r.status==='completed').length;
            const streak = Math.max(0, ...habits.map(h=>h.streak||0));
            const moodVals = Object.values(moodLog).filter(v=>v!==undefined);
            const avgMood = moodVals.length ? (moodVals.reduce((a,b)=>a+b,0)/moodVals.length).toFixed(1) : 'N/A';
            const monthExp = finData.expenses.slice(0,30).reduce((s,e)=>s+Number(e.amount),0);
            let prompt = '';
            if(type==='productivity') prompt = `User stats: ${completedTasks}/${totalTasks} tasks completed, best habit streak: ${streak} days, avg mood: ${avgMood}/4. Give 3 specific, actionable productivity tips in bullet points (max 4 lines total). Be encouraging and direct.`;
            else if(type==='habits') prompt = `User has ${habits.length} habits. Best streak: ${streak} days. Habits: ${habits.map(h=>h.name+'('+h.streak+' days)').join(', ')||'none'}. Give 3 habit improvement tips in bullet points. Max 4 lines.`;
            else if(type==='finance') prompt = `Monthly expenses: ₹${monthExp.toLocaleString('en-IN')}. Income: ₹${finData.income.slice(0,5).reduce((s,e)=>s+Number(e.amount),0).toLocaleString('en-IN')}. EMIs: ${finData.emis.length}. Give 3 finance tips in bullet points. Max 4 lines.`;
            const reply = await callGeminiAI(prompt);
            if(el) el.innerHTML = reply.replace(/\n/g,'<br>');
            const card = document.getElementById('aiCoachCard');
            if(card) card.innerHTML = `<p style="margin:0;font-size:13px;opacity:0.9">Last coaching: ${new Date().toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}</p>`;
        } catch(e) {
            if(el) el.innerHTML = e.message==='NO_KEY' ? '<p>⚠️ Add Gemini API Key in Settings → Save to use AI Coach!</p>' : '<p>⚠️ Error: '+e.message+'</p>';
        }
    }

    // ============================================================
    // VOICE COMMANDS
    // ============================================================
    let voiceRecognition = null;
    function startVoiceCommand() {
        if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return showToast('Voice not supported in this browser. Try Chrome!', 'error');
        }
        const overlay = document.getElementById('voiceOverlay');
        if(overlay) overlay.style.display='flex';
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechRecognition();
        voiceRecognition.continuous = false; voiceRecognition.interimResults = true;
        voiceRecognition.lang = 'en-IN';
        voiceRecognition.onresult = e => {
            const transcript = Array.from(e.results).map(r=>r[0].transcript).join('');
            const el = document.getElementById('voiceTranscript'); if(el) el.innerText = transcript;
            if(e.results[0].isFinal) processVoiceCommand(transcript);
        };
        voiceRecognition.onerror = () => { stopVoiceCommand(); showToast('Voice error. Try again!', 'error'); };
        voiceRecognition.onend = () => stopVoiceCommand();
        voiceRecognition.start();
        hapticFeedback('medium');
    }

    function stopVoiceCommand() {
        if(voiceRecognition) { try { voiceRecognition.stop(); } catch(e) {} voiceRecognition = null; }
        const overlay = document.getElementById('voiceOverlay'); if(overlay) overlay.style.display='none';
    }

    async function processVoiceCommand(transcript) {
        stopVoiceCommand();
        showToast(`🎤 Heard: "${transcript}"`, 'info');
        if(!transcript.trim()) return;
        try {
            const prompt = `The user said: "${transcript}"\nExtract a task from this voice command. Reply ONLY in this exact JSON format (no extra text): {"task":"task name here","priority":"low/medium/high","time":"YYYY-MM-DDTHH:MM or null"}\nIf no clear time mentioned, set time to null. Today is ${getTodayStr()}.`;
            const reply = await callGeminiAI(prompt);
            const clean = reply.replace(/```json?|```/g,'').trim();
            const parsed = JSON.parse(clean);
            if(parsed.task) {
                switchPage('add');
                setTimeout(() => {
                    document.getElementById('taskInput').value = parsed.task;
                    if(parsed.priority) document.getElementById('priorityInput').value = parsed.priority;
                    if(parsed.time) document.getElementById('timeInput').value = parsed.time;
                    updateCategoryPreview();
                    showToast('✅ Task ready! Tap Save.', 'success');
                }, 300);
            }
        } catch(e) {
            const taskInput = document.getElementById('taskInput');
            switchPage('add');
            setTimeout(() => { if(taskInput) taskInput.value = transcript; updateCategoryPreview(); }, 300);
        }
    }

    // ============================================================
    // SETTINGS INIT ON LOAD
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        const autoDark = JSON.parse(localStorage.getItem('autoDark') || 'null');
        if(autoDark) {
            const toggle = document.getElementById('autoDarkToggle');
            if(toggle) toggle.checked = autoDark.enabled;
            const fromEl = document.getElementById('autoDarkFrom');
            const toEl = document.getElementById('autoDarkTo');
            if(fromEl) fromEl.value = autoDark.from || '20:00';
            if(toEl) toEl.value = autoDark.to || '07:00';
            const wrap = document.getElementById('autoDarkTimesWrap');
            if(wrap) wrap.style.display = autoDark.enabled ? 'block' : 'none';
            checkAutoDark();
        }
        const hapticEl = document.getElementById('hapticToggle');
        if(hapticEl) hapticEl.checked = localStorage.getItem('haptic') === 'true';
        applyWidgetPrefs();
    });

</script>

</body>
</html>
