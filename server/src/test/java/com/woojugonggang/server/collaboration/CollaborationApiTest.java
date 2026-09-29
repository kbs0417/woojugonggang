package com.woojugonggang.server.collaboration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class CollaborationApiTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    void twoUsersCanJoinAndShareChatMessages() throws Exception {
        login("alice");
        login("bob");

        String created = mockMvc.perform(post("/api/posts")
                        .header("X-User-Name", "alice")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"학습","title":"API 협업 테스트","tags":["api"],
                                 "description":"함께 작업해요","place":"도서관","day":"월","hour":10,
                                 "capacity":4,"grade":"전 학년","department":"전공 무관","matchType":"시간표"}
                                """))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.owner").value(true))
                .andReturn().getResponse().getContentAsString();
        JsonNode post = objectMapper.readTree(created);
        long postId = post.get("id").asLong();
        long roomId = post.get("roomId").asLong();

        mockMvc.perform(post("/api/posts/{id}/participants", postId).header("X-User-Name", "bob"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.joined").value(true));
        mockMvc.perform(post("/api/chat-rooms/{id}/messages", roomId)
                        .header("X-User-Name", "bob").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"안녕 alice\"}"))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/chat-rooms/{id}/messages", roomId).header("X-User-Name", "alice"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].text").value("안녕 alice"));
    }

    private void login(String username) throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"admin\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.username").value(username));
    }
}
