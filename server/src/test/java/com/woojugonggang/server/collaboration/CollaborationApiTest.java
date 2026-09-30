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
        register("alice", "앨리스");
        register("bob_user", "밥");
        login("alice");
        login("bob_user");

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

        String notifications = mockMvc.perform(get("/api/notifications").header("X-User-Name", "bob_user"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].postId").value(postId))
                .andExpect(jsonPath("$[0].read").value(false))
                .andReturn().getResponse().getContentAsString();
        long notificationId = objectMapper.readTree(notifications).get(0).get("id").asLong();
        mockMvc.perform(patch("/api/notifications/{id}/read", notificationId).header("X-User-Name", "bob_user"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.read").value(true));

        mockMvc.perform(post("/api/posts/{id}/participants", postId).header("X-User-Name", "bob_user"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.joined").value(true));
        mockMvc.perform(post("/api/chat-rooms/{id}/messages", roomId)
                        .header("X-User-Name", "bob_user").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"안녕 alice\"}"))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/chat-rooms/{id}/messages", roomId).header("X-User-Name", "alice"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].text").value("안녕 alice"));

        mockMvc.perform(put("/api/posts/{id}", postId).header("X-User-Name", "alice")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"category":"학습","title":"수정된 모집글","tags":["api","수정"],
                                 "description":"수정한 설명","place":"공학관","day":"화","hour":11,
                                 "capacity":5,"grade":"전 학년","department":"전공 무관","matchType":"시간표"}
                                """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("수정된 모집글"));
        mockMvc.perform(delete("/api/posts/{id}", postId).header("X-User-Name", "bob_user"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/posts/{id}", postId).header("X-User-Name", "alice"))
                .andExpect(status().isNoContent());
    }

    private void login(String username) throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.username").value(username));
    }

    private void register(String username, String displayName) throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"displayName\":\"" + displayName
                                + "\",\"password\":\"password123\",\"age\":23,\"gender\":\"남성\","
                                + "\"department\":\"컴퓨터공학과\",\"interests\":[\"학습\"],\"interestDetails\":[\"프로젝트\"]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.age").value(23))
                .andExpect(jsonPath("$.gender").value("남성"))
                .andExpect(jsonPath("$.department").value("컴퓨터공학과"))
                .andExpect(jsonPath("$.interestDetails[0]").value("프로젝트"));
    }
}
