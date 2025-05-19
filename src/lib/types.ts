export interface Message {
    sender: string
    text: string
    timestamp: string
}

export interface MessageRow {
    is_from_me: boolean
    text: string
    date: string
    contact_id?: string
    timestamp: string
}
