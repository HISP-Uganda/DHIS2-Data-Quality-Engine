import React from "react"
import { Box } from "@chakra-ui/react"
import { Typography } from "antd"

const { Title } = Typography


export default function Home() {
    return (
        <Box p="1rem">
            <Title level={2}>IWS Dashboard</Title>
        </Box>
    )
}
