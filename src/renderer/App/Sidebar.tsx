import { queries } from "common/queries";
import React, { useState } from "react";
import { useAsyncCallback } from "react-async-hook";
import { FormattedMessage } from "react-intl";
import { Icon } from "renderer/basics/Icon";
import { IconButton } from "renderer/basics/IconButton";
import { Modal } from "renderer/basics/Modal";
import { useProfile, useSocket } from "renderer/Route";
import styled from "renderer/styles";

const SidebarDiv = styled.div`
  flex-basis: 240px;
  background: ${props => props.theme.sidebarBackground};

  border-right: 2px solid ${props => props.theme.sidebarBorder};

  display: flex;
  flex-direction: column;
  align-items: center;
`;

const LogoImg = styled.img`
  width: 110px;
  padding-top: 20px;
  padding-bottom: 20px;
`;

const SidebarElement = styled.a`
  width: 100%;
  text-align: left;
  padding: 20px 10px;

  transition: 0.2s all;
  color: ${props => props.theme.secondaryText};

  &:hover {
    background: ${props => props.theme.sidebarEntryFocusedBackground};
    color: ${props => props.theme.baseText};
    cursor: pointer;
  }

  text-decoration: none;
  font-size: 18px;
  font-weight: lighter;

  .icon {
    display: inline-block;
    width: 2em;
    text-align: center;
  }
`;

const Spacer = styled.div`
  flex-grow: 1;
`;

type PopoverName = "preferences" | "downloads" | null;

export const Sidebar = () => {
  const [popover, setPopover] = useState<PopoverName>(null);
  let profile = useProfile();
  let socket = useSocket();

  let logout = useAsyncCallback(async () => {
    await socket.query(queries.setProfile, {});
  });

  return (
    <SidebarDiv>
      <LogoImg src={require("static/images/logos/app-white.svg")} />
      <SidebarElement href="https://itch.io">
        <Icon icon="earth" /> <FormattedMessage id={"sidebar.explore"} />
      </SidebarElement>
      <SidebarElement href="itch://library">
        <Icon icon="heart-filled" /> <FormattedMessage id={"sidebar.library"} />
      </SidebarElement>
      <SidebarElement href="itch://collections">
        <Icon icon="video_collection" />{" "}
        <FormattedMessage id={"sidebar.collections"} />
      </SidebarElement>
      <SidebarElement href="itch://dashboard">
        <Icon icon="archive" /> <FormattedMessage id={"sidebar.dashboard"} />
      </SidebarElement>
      <Spacer />
      <SidebarElement onClick={() => setPopover("downloads")}>
        <Icon icon="download" /> <FormattedMessage id={"sidebar.downloads"} />
      </SidebarElement>
      <SidebarElement onClick={() => setPopover("preferences")}>
        <Icon icon="cog" /> <FormattedMessage id={"sidebar.preferences"} />
      </SidebarElement>
      {profile ? (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {profile.user.displayName || profile.user.username}
          &nbsp;
          <IconButton icon="exit" onClick={logout.execute} />
        </div>
      ) : (
        "no profile"
      )}
      <Popover name={popover} onClose={() => setPopover(null)} />
    </SidebarDiv>
  );
};

const Popover = (props: { name: PopoverName; onClose: () => void }) => {
  const socket = useSocket();
  const switchLanguage = useAsyncCallback(async lang => {
    socket.query(queries.switchLanguage, { lang });
  });

  const { name, onClose } = props;
  switch (name) {
    case "preferences":
      return (
        <Modal
          onClose={onClose}
          title={<FormattedMessage id="sidebar.preferences" />}
        >
          <p>Have some prefs!</p>
          <p>
            <button onClick={() => switchLanguage.execute("fr")}>
              Switch to French
            </button>
          </p>
          <p>
            <button onClick={() => switchLanguage.execute("en")}>
              Switch to English
            </button>
          </p>
        </Modal>
      );
    case "downloads":
      return (
        <Modal
          onClose={onClose}
          title={<FormattedMessage id="sidebar.downloads" />}
        >
          <p>Your downloads go here</p>
        </Modal>
      );
    case null:
      return null;
  }
};