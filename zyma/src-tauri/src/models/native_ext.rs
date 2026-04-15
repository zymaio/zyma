use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeChatParticipant {
    pub id: String,
    pub name: String,
    pub full_name: String,
    pub description: String,
    pub command: String,
    pub thought_event: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeAuthProvider {
    pub id: String,
    pub label: String,
    pub login_command: String,
    pub logout_command: String,
    pub auth_event: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeSidebarItem {
    pub id: String,
    pub title: String,
    pub icon: String,
    pub command: String,
    pub params: Option<serde_json::Value>,
    pub color: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeFileMenuItem {
    pub pattern: String,
    pub title: String,
    pub icon: Option<String>,
    pub command: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeSlotComponent {
    pub slot: String,
    pub id: String,
    pub component_type: String,
    pub params: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeCommand {
    pub id: String,
    pub title: String,
    pub category: Option<String>,
}
