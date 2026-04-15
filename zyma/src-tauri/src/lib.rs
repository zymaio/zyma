pub mod errors;
pub mod models;
pub mod commands;
pub mod llm;
pub mod bus;
pub mod services;
pub mod core;

pub use core::builder::ZymaBuilder;
pub use core::setup::setup_zyma;
pub use models::*;

pub fn run() {
    let mut slf = ZymaBuilder::new();
    slf.builder = slf.builder.invoke_handler(crate::commands::get_handlers());
    slf.run(tauri::generate_context!());
}
