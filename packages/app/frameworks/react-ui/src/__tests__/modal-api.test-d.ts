import { createElement, createRef } from 'react'

import type { ModalProps } from '@molecule/app-ui'

import { Modal } from '../components/Modal.js'

const props: ModalProps = { open: true, onClose: () => {}, children: 'Dialog body' }
createElement(Modal, { ...props, ref: createRef<HTMLDivElement>() })
